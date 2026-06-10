#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Job 2: Struct Job (The Heart of Ingestion v2).
Rasterizes PDF pages to PNG (dpi=170), calculates sha1 hash, calls gemini-3.1-flash-lite
with standard vision-first prompts and response schemas to output flat blocks nested by parent IDs.
Saves pages draft blocks to database/local_db and spawns Stage 3.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import io
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
import json
import time
import base64
import hashlib
import threading
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
import fitz  # PyMuPDF
import requests
from google import genai
from google.genai import types
from schema import PageStructure, FlatBlock

from utils import (
    update_job_status, check_cooperative_control, ROOT_DIR,
    JSON_Encoder, get_gemini_config, execute_with_retry,
    is_mongodb_enabled, get_mongodb_uri, make_progress_bar,
    LOCAL_DB_PATH, get_active_db
)

db_write_lock = threading.Lock()


PAGE_STRUCTURE_SCHEMA = {
  "type": "OBJECT",
  "properties": {
    "dir": {
      "type": "STRING",
      "enum": ["rtl", "ltr"]
    },
    "blocks": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "id": {"type": "STRING"},
          "parent": {"type": "STRING"},
          "type": {
            "type": "STRING",
            "enum": ["heading", "paragraph", "definition", "list", "table", "equation", "code", "figure", "question", "callout", "example", "step"]
          },
          "level": {"type": "INTEGER"},
          "text": {"type": "STRING"},
          "term": {"type": "STRING"},
          "ordered": {"type": "BOOLEAN"},
          "items": {
            "type": "ARRAY",
            "items": {"type": "STRING"}
          },
          "rows": {
            "type": "ARRAY",
            "items": {
              "type": "ARRAY",
              "items": {"type": "STRING"}
            }
          },
          "latex": {"type": "STRING"},
          "lang": {"type": "STRING"},
          "caption": {"type": "STRING"},
          "ref": {"type": "STRING"},
          "variant": {
            "type": "STRING",
            "enum": ["note", "warning", "tip"]
          },
          "label": {"type": "STRING"},
          "title": {"type": "STRING"},
          "prompt": {"type": "STRING"},
          "options": {
            "type": "ARRAY",
            "items": {"type": "STRING"}
          },
          "answer": {"type": "STRING"},
          "dir": {
            "type": "STRING",
            "enum": ["rtl", "ltr"]
          }
        },
        "required": ["id", "parent", "type"]
      }
    }
  },
  "required": ["dir", "blocks"]
}

STRUCTURING_PROMPT = """
You are an expert visual textbook analysis and structural parsing engine. Convert the raw visual PDF page image into a beautiful, structurally annotated list of typed blocks in natural reading order.
Strictly adhere to the following layout parsing rules:
1. READING ORDER (RTL-aware):
   - For Arabic books, read right-to-left, top-to-bottom, completing a column before proceeding to the next. Set "dir" to "rtl". For English, set "dir" to "ltr".
2. NESTING & PARENT POINTERS:
   - Identify visual container bounds (like a callout box, example card, or step lists). Use the "parent" pointer field of child blocks to reference the container's "id" (arbitrary depth like card -> step -> equation).
3. CALLOUTS & EXAMPLES:
   - Callouts and examples MUST contain their body as children. Never emit an empty callout/example block with no children. Capture the banner label (e.g. "CHECKPOINT" or "معلومة إثرائية") in "label", severity in "variant", and the actual title line in "title".
4. QUESTIONS & MCQs:
   - When a multiple-choice question is present on the page, represent it as a single block of type "question".
   - Put the question stem/text into the "prompt" field.
   - Put the multiple-choice choices (options) together as a list of strings in the "options" field of that same "question" block.
   - NEVER emit multiple-choice options as separate "paragraph" or "list" blocks. They must always be grouped inside the "options" field of the "question" block.
   - Options must carry NO letter or number prefixes (like 'a.', 'b.', '1.', '2.', 'أ.', 'ب.'). The rendering client handles prefix injection automatically. Keep option/answer text clean.
5. FIGURES & GRAPHS:
   - Create exactly ONE "figure" block per visual chart, diagram, map, or photo. The "caption" is REQUIRED and must contain your detailed, direct visual description of the visual's content (~40-90 words summarizing visual trends/objects; do not transcribe data). Store printed labels ("Figure 1.2") in "ref". Empty captions are invalid.
6. MATH, CODE, & DEFINITIONS:
   - Mathematical equations must be stored under "equation" blocks, enclosing LaTeX in the "latex" field.
   - Code lines must be stored in "code" blocks, storing code in "text" and language in "lang".
   - Headwords of academic definitions must be stored in "term" and their explanations in "text".
7. DROP RUNNING HEADERS, FOOTERS, PAGE NUMBERS, WATERMARKS:
   - Do NOT emit blocks for page headers, footers, page numbering, or decorative logo labels. Filter them out entirely.
"""

def parse_salvaged_json(json_str):
    """
    Tries to parse JSON. If truncated, trims trailing fragments, balances brackets,
    and returns a salvageable, partial block array.
    """
    try:
        return json.loads(json_str)
    except Exception as e:
        print(f"[Salvage Parser] Initial JSON load failed: {e}. Attempting salvage recovery...", file=sys.stderr)
        
    # Attempt simple truncation fix: find last complete array entry
    # Scan backwards to locate the last "}" that belongs to a block item list
    # We find the blocks array start bracket '['
    blocks_start = json_str.find('"blocks":')
    if blocks_start == -1:
        return None
        
    array_start = json_str.find('[', blocks_start)
    if array_start == -1:
        return None
        
    # Cut off everything after the last block item closing curly brace
    last_block_close = json_str.rfind('}')
    if last_block_close == -1 or last_block_close < array_start:
        return None
        
    # Cut string to end of last successfully closed object
    salvaged_array = json_str[array_start:last_block_close+1]
    
    # Balance brackets of the parent structures
    # We cut before, parse the list, and construct a fake parent dictionary
    try:
        # Check if we need to close the array with ']'
        blocks_list = json.loads(salvaged_array + ']')
        # Deduce direction
        dir_val = "rtl" if "العربية" in json_str or "rtl" in json_str else "ltr"
        return {"dir": dir_val, "blocks": blocks_list}
    except Exception as err2:
        print(f"[Salvage Parser] Salvage failed: {err2}", file=sys.stderr)
        
    return None

import re

def _has_arabic(text: str) -> bool:
    if not text:
        return False
    for char in text:
        if ('\u0600' <= char <= '\u06FF' or 
            '\u0750' <= char <= '\u077F' or 
            '\u08A0' <= char <= '\u08FF' or 
            '\uFB50' <= char <= '\uFDFF' or 
            '\uFE70' <= char <= '\uFEFF'):
            return True
    return False

def get_block_text_for_dir(b):
    parts = []
    is_dict = isinstance(b, dict)
    text = b.get("text") if is_dict else getattr(b, "text", None)
    term = b.get("term") if is_dict else getattr(b, "term", None)
    prompt = b.get("prompt") if is_dict else getattr(b, "prompt", None)
    label = b.get("label") if is_dict else getattr(b, "label", None)
    title = b.get("title") if is_dict else getattr(b, "title", None)
    items = b.get("items") if is_dict else getattr(b, "items", None)
    
    if text: parts.append(text)
    if term: parts.append(term)
    if prompt: parts.append(prompt)
    if label: parts.append(label)
    if title: parts.append(title)
    if items:
        for item in items:
            if item: parts.append(item)
    return " ".join(parts)

def verify_blocks_integrity(blocks, page_num):
    parents = set()
    for b in blocks:
        parent_val = b.get("parent") if isinstance(b, dict) else getattr(b, "parent", "")
        if parent_val:
            parents.add(parent_val)
            
    for b in blocks:
        b_id = b.get("id") if isinstance(b, dict) else getattr(b, "id", "")
        b_type = b.get("type") if isinstance(b, dict) else getattr(b, "type", None)
        if hasattr(b_type, "value"):
            b_type = b_type.value
            
        if b_type in ["callout", "example"]:
            if b_id not in parents:
                # Self-healing: Demote hollow container to paragraph
                print(f"[Self-Healing] Hollow container '{b_type}' block '{b_id}' on page {page_num} has no child blocks. Demoting to paragraph.", file=sys.stderr)
                if isinstance(b, dict):
                    b["type"] = "paragraph"
                    if not b.get("text"):
                        b["text"] = b.get("title") or b.get("label") or b.get("prompt") or ""
                else:
                    setattr(b, "type", "paragraph")
                    if not getattr(b, "text", None):
                        setattr(b, "text", getattr(b, "title", None) or getattr(b, "label", None) or getattr(b, "prompt", None) or "")
        elif b_type == "code":
            text_val = b.get("text") if isinstance(b, dict) else getattr(b, "text", "")
            if not text_val or not text_val.strip():
                # Self-healing: Demote empty code block to paragraph
                print(f"[Self-Healing] Empty code block '{b_id}' on page {page_num}. Changing to paragraph.", file=sys.stderr)
                if isinstance(b, dict):
                    b["type"] = "paragraph"
                    b["text"] = " "
                else:
                    setattr(b, "type", "paragraph")
                    setattr(b, "text", " ")
        elif b_type == "list":
            items_val = b.get("items") if isinstance(b, dict) else getattr(b, "items", [])
            if not items_val or len(items_val) == 0:
                # Self-healing: Demote empty list block to paragraph
                print(f"[Self-Healing] Empty list block '{b_id}' on page {page_num}. Demoting to paragraph.", file=sys.stderr)
                if isinstance(b, dict):
                    b["type"] = "paragraph"
                    b["text"] = b.get("text") or " "
                else:
                    setattr(b, "type", "paragraph")
                    setattr(b, "text", getattr(b, "text", None) or " ")

def strip_markdown_json(text):
    text = text.strip()
    pattern = re.compile(r'```(?:json)?\s*(.*?)\s*```', re.DOTALL | re.IGNORECASE)
    match = pattern.search(text)
    if match:
        return match.group(1).strip()
    return text

def analyze_page_with_gemini_vision(png_bytes, api_key, model, page_num):
    """
    Call Gemini LLM via official google-genai SDK, passing the image bytes,
    the structuring prompt, and the PageStructure Pydantic schema.
    """
    try:
        if api_key:
            client = genai.Client(api_key=api_key)
        else:
            client = genai.Client()
            
        # Ensure we replace page placeholder in prompt
        prompt = STRUCTURING_PROMPT
        if "{page}" in prompt:
            prompt = prompt.replace("{page}", str(page_num))
            
        resp = client.models.generate_content(
            model=model or "gemini-3.1-flash-lite",
            contents=[
                types.Part.from_bytes(data=png_bytes, mime_type="image/png"),
                prompt,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=PageStructure,
                temperature=0.0,
                max_output_tokens=32768,
            ),
        )
        
        json_text = resp.text
        if not json_text:
            raise ValueError(f"Gemini structuring API returned empty response text for Page {page_num}")
            
        json_text = strip_markdown_json(json_text)
            
        parsed_struct = PageStructure.model_validate_json(json_text)
        
        blocks_dict_list = []
        for i, b in enumerate(parsed_struct.blocks):
            if not b.id:
                b.id = f"p{page_num}-b{i}"
            b_dict = b.model_dump(exclude_none=True)
            
            # Script-based block-level dir detection
            b_text = get_block_text_for_dir(b_dict)
            if b_text.strip():
                b_dict["dir"] = "rtl" if _has_arabic(b_text) else "ltr"
            else:
                b_dict["dir"] = parsed_struct.dir
                
            blocks_dict_list.append(b_dict)
            
        # Verify block integrity
        verify_blocks_integrity(blocks_dict_list, page_num)
                
        return {
            "dir": parsed_struct.dir,
            "blocks": blocks_dict_list
        }
    except Exception as e:
        print(f"[Vision call Exception] {e}", file=sys.stderr)
        # Attempt recovery with salvage parser if we have JSON string
        try:
            if 'resp' in locals() and resp and resp.text:
                json_text = resp.text
                json_text = strip_markdown_json(json_text)
                parsed = parse_salvaged_json(json_text)
                if parsed:
                    salvaged_blocks = parsed.get("blocks", [])
                    for b_dict in salvaged_blocks:
                        b_text = get_block_text_for_dir(b_dict)
                        if b_text.strip():
                            b_dict["dir"] = "rtl" if _has_arabic(b_text) else "ltr"
                        else:
                            b_dict["dir"] = parsed.get("dir", "rtl")
                    verify_blocks_integrity(salvaged_blocks, page_num)
                    print(f"[Vision call Exception] Successfully salvaged and verified partial response for Page {page_num}", file=sys.stderr)
                    return parsed
                else:
                    raise ValueError(f"JSON salvage returned empty parsing result for Page {page_num}")
            else:
                raise ValueError(f"No response text available for JSON salvage on Page {page_num}")
        except Exception as salvage_err:
            print(f"[Vision call Exception] Salvage attempt failed: {salvage_err}", file=sys.stderr)
            raise RuntimeError(f"Vision call and salvage both failed. Original error: {e}. Salvage error: {salvage_err}") from e
        
        raise RuntimeError(f"Vision call failed: {e}")

def find_cached_page_by_hash(page_hash, is_local):
    """
    Looks up an existing page doc by pageHash in MongoDB or local_db.json.
    """
    if is_local or not is_mongodb_enabled():
        if os.path.exists(LOCAL_DB_PATH):
            try:
                with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                    db = json.load(f)
                for p in db.get("book_pages", []):
                    if p.get("pageHash") == page_hash and p.get("blocks"):
                        return p
            except Exception:
                pass
    if is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri(), serverSelectionTimeoutMS=5000)
            db = get_active_db(client)
            # Find a page that is successfully structured and has blocks
            p = db["book_pages"].find_one({"pageHash": page_hash, "blocks": {"$exists": True, "$not": {"$size": 0}}})
            client.close()
            if p:
                return p
        except Exception as e:
            print(f"[Cache Lookup Error] MongoDB lookup failed: {e}", file=sys.stderr)
            pass
    return None

def format_blocks_tree(blocks):
    """
    Builds a beautiful ASCII tree of FlatBlocks for logging.
    """
    from schema import rebuild_tree, FlatBlock
    typed_blocks = []
    for b in blocks:
        try:
            typed_blocks.append(FlatBlock(**b) if isinstance(b, dict) else b)
        except Exception:
            pass
    if not typed_blocks:
        return "  (No blocks found)"
    
    roots = rebuild_tree(typed_blocks)
    lines = []
    
    def _render_node(node, prefix=""):
        b = node.block
        b_type = b.type.value if hasattr(b.type, "value") else str(b.type)
        label = b.text or b.prompt or b.term or b.label or ""
        if len(label) > 40:
            label = label[:37] + "..."
        label = label.replace("\n", " ")
        lines.append(f"  {prefix}└── [{b_type}] {label}")
        
        # Render children
        children = node.children
        for i, child in enumerate(children):
            # If it is the last child of this container, we can render nice prefix
            is_last = (i == len(children) - 1)
            next_prefix = prefix + ("    " if is_last else "│   ")
            _render_node(child, next_prefix)
            
    for r in roots:
        _render_node(r)
        
    return "\n".join(lines)

def process_single_page_worker(page_num, temp_pdf_path, api_key, model, payload):
    """
    Thread-pool worker processing a single PDF page: rasterization, sha1, Gemini structuring.
    With content-addressed deduplication (skip + serve-from-cache).
    """
    try:
        # Open document locally inside thread context to ensure safety
        doc = fitz.open(temp_pdf_path)
        page = doc.load_page(page_num - 1)
        
        # 1. Rasterize Page to PNG
        pix = page.get_pixmap(dpi=170)
        png_bytes = pix.tobytes("png")
        
        # 2. Extract plain text as a fallback resource (no longer used for fallback structuring, keeping closure clean)
        raw_text = page.get_text()
        doc.close()
        
        # 3. Calculate pageHash
        page_hash = hashlib.sha1(png_bytes).hexdigest()
        
        # 4. Check Cache/Deduplication
        is_local = payload.get("is_local", True)
        cached_page = find_cached_page_by_hash(page_hash, is_local)
        if cached_page:
            print(f"[Worker] ⚡ Page {page_num} Cache HIT! Restoring from cache hash {page_hash[:10]}...", flush=True)
            page_doc = {
                "_id": f"page_{payload['book_id']}_{page_num}",
                "book_id": payload["book_id"],
                "page_number": page_num,
                "dir": cached_page.get("dir", "rtl"),
                "blocks": cached_page.get("blocks", []),
                "status": cached_page.get("status", "structured"),
                "pageHash": page_hash,
                "model": cached_page.get("model") or model or "gemini-3.1-flash-lite",
                "is_cached": True
            }
            if "i18n" in cached_page:
                page_doc["i18n"] = cached_page["i18n"]
            if "embedding" in cached_page:
                page_doc["embedding"] = cached_page["embedding"]
                page_doc["embed_model"] = cached_page.get("embed_model")
                page_doc["embed_dim"] = cached_page.get("embed_dim")
                page_doc["embed_provenance"] = cached_page.get("embed_provenance")
            if "concepts" in cached_page:
                page_doc["concepts"] = cached_page["concepts"]
            if "formulas" in cached_page:
                page_doc["formulas"] = cached_page["formulas"]
                
            return page_num, page_doc, None

        # 5. Attempt structuring via API
        structured_data = None
        err_msg = ""
        try:
            def _api_call():
                return analyze_page_with_gemini_vision(png_bytes, api_key, model, page_num)
            structured_data = execute_with_retry(_api_call, max_retries=5, base_delay=2.0)
        except Exception as api_err:
            err_msg = str(api_err)
            print(f"[Worker] API Structuring attempt failed on Page {page_num}: {api_err}", file=sys.stderr)

        # RESILIENCE (replaces the all-or-nothing abort): a page that fails vision
        # (429/truncation) or returns no blocks must NOT crash the whole book. Keep the
        # raw extracted text so the page's content still embeds/searches; a genuinely
        # blank/image-only page is marked 'empty' (valid, no implications downstream).
        if structured_data and structured_data.get("blocks"):
            status = "structured"
            blocks = structured_data.get("blocks", [])
            page_dir = structured_data.get("dir", "rtl")
        else:
            clean_text = (raw_text or "").strip()
            page_dir = "rtl" if _has_arabic(clean_text) else "ltr"
            if clean_text:
                status = "text_fallback"
                blocks = [{"id": f"p{page_num}-fallback", "parent": "", "type": "paragraph",
                           "text": clean_text, "dir": page_dir}]
                print(f"[Worker] Page {page_num}: vision unavailable ({err_msg or 'empty'}); kept raw-text fallback ({len(clean_text)} chars).", file=sys.stderr)
            else:
                status = "empty"
                blocks = []
                print(f"[Worker] Page {page_num}: blank/image-only — marked 'empty'.", file=sys.stderr)

        page_doc = {
            "_id": f"page_{payload['book_id']}_{page_num}",
            "book_id": payload["book_id"],
            "page_number": page_num,
            "dir": page_dir,
            "blocks": blocks,
            "status": status,
            "pageHash": page_hash,
            "model": model or "gemini-3.1-flash-lite"
        }
        return page_num, page_doc, None
    except Exception as page_err:
        return page_num, None, str(page_err)

def main():
    try:
        payload = json.loads(sys.stdin.read())
    except Exception as e:
        print(f"Error parsing stdin JSON in Job 2: {e}", file=sys.stderr)
        sys.exit(1)

    book_id = payload.get("book_id")
    temp_pdf_path = payload.get("temp_pdf_path")
    total_pages = payload.get("total_pages", 1)
    is_local = payload.get("is_local", True)
    logs = payload.get("ingestion_logs", [])
    
    job_id = f"job_{book_id}"
    
    metadata = {
        "book_id": book_id,
        "subject_id": payload.get("subject_id"),
        "title": payload.get("title"),
        "title_ar": payload.get("title_ar"),
        "source_url": payload.get("source_url"),
        "storage_path": payload.get("storage_path"),
        "grade": payload.get("grade"),
        "term": payload.get("term"),
        "year": payload.get("year"),
        "language": payload.get("language"),
        "book_type": payload.get("book_type"),
        "userId": payload.get("userId")
    }

    t_str = time.strftime("%H:%M:%S")
    logs.append(f"[{t_str}] [STRUCT] Job 2: Loaded raw file. Initiating concurrent optical vision extraction threads.")
    update_job_status(job_id, "processing", "struct", 30, logs, 0, total_pages, False, is_local, **metadata)

    api_key, model = get_gemini_config()
    if api_key:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [STRUCT] Configured vision analyzer with API key. Model: '{model}'. Launching parallel workers.")
    else:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [STRUCT] Configured vision analyzer using Application Default Credentials (ADC) / Vertex AI. Model: '{model}'. Launching parallel workers.")

    processed_pages = 0
    final_pages = {}
    has_errors = False

    struct_start_time = time.time()

    # Thread Pool execution (raised 3->6 now that page failures are non-fatal + 429 backs off)
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {
            executor.submit(process_single_page_worker, p_num, temp_pdf_path, api_key, model, payload): p_num
            for p_num in range(1, total_pages + 1)
        }
        
        for future in as_completed(futures):
            p_num = futures[future]
            check_cooperative_control(job_id, is_local, logs)
            
            p_no, p_doc, err_msg = future.result()
            if p_doc:
                processed_pages += 1
                final_pages[p_no] = p_doc
                
                pct = 30 + int((processed_pages / total_pages) * 25)  # Range 30% - 55%
                sub_pct = (processed_pages / total_pages) * 100.0
                bar = make_progress_bar(sub_pct, width=20)
                
                # Compute ETA
                elapsed = time.time() - struct_start_time
                avg_time = elapsed / processed_pages
                rem_pages = total_pages - processed_pages
                eta_s = int(avg_time * rem_pages)
                eta_str = f"{eta_s}s" if eta_s < 60 else f"{eta_s//60}m {eta_s%60}s"
                
                log_msg = f"{bar} Parsed Page {p_no}/{total_pages} (Blocks Count: {len(p_doc['blocks'])}) [ETA {eta_str}]."
                print(f"[JOB 2: STRUCT] {log_msg}", flush=True)
                
                # Format logical object tree
                tree_str = format_blocks_tree(p_doc['blocks'])
                logs.append(f"[{time.strftime('%H:%M:%S')}] [STRUCT] {log_msg}\nObject-Tree:\n{tree_str}")
                
                # Write page to database
                with db_write_lock:
                    update_job_status(
                        job_id, "processing", "struct", pct, logs,
                        processed_pages=processed_pages, total_pages=total_pages,
                        is_completed=False, is_local=is_local, new_page_doc=p_doc, **metadata
                    )
            else:
                has_errors = True
                logs.append(f"[{time.strftime('%H:%M:%S')}] [STRUCT_ERROR] Page {p_num} failed: {err_msg}")
                print(f"[JOB 2: STRUCT_ERROR] Page {p_num} failed: {err_msg}", file=sys.stderr)
                with db_write_lock:
                    update_job_status(job_id, "processing", "struct", 30, logs, processed_pages, total_pages, False, is_local, **metadata)

    fallback_pages = sum(1 for d in final_pages.values() if d.get("status") in ("text_fallback", "empty"))
    real_pages = processed_pages - fallback_pages
    unrecoverable = total_pages - processed_pages

    # Only abort on a CATASTROPHIC shortfall (systemic failure: bad model/quota/key),
    # never over a handful of odd pages on a long book. Resilient pages already carry
    # raw-text fallback or are marked 'empty', so the book stays usable.
    if processed_pages < max(1, int(total_pages * 0.5)):
        logs.append(f"[{time.strftime('%H:%M:%S')}] [STRUCT] ❌ Job 2 failed: only {processed_pages}/{total_pages} pages processed ({real_pages} structured). Systemic failure — downstream aborted.")
        update_job_status(job_id, "failed", "struct", 30, logs, processed_pages, total_pages, False, is_local, **metadata)
        sys.exit(1)

    if fallback_pages or unrecoverable:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [STRUCT] ⚠️ Structuring complete (resilient): {real_pages} structured, {fallback_pages} text-fallback/empty, {unrecoverable} unrecoverable of {total_pages}. Proceeding to downstream.")
    else:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [STRUCT] ✅ Page structuring completed successfully (all {total_pages} pages). Triggering Downstream Job 3 (Translate)...")
    update_job_status(job_id, "processing", "translate", 55, logs, processed_pages, total_pages, False, is_local, **metadata)

    # Trigger Job 3 (Translate)
    try:
        python_path = sys.executable or "python"
        SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
        translate_script = os.path.join(SCRIPT_DIR, "job_translate.py")
        
        payload["ingestion_logs"] = logs
        payload["temp_pdf_path"] = temp_pdf_path
        
        # To prevent stdout/stderr swallow and ensure visibility in GCP container logs,
        # we write standard streams directly without local file log cache redirection.
        popen_kwargs = {
            "stdin": subprocess.PIPE,
            "stdout": None,
            "stderr": None,
            "text": True,
            "close_fds": True,
            "env": dict(os.environ, PYTHONIOENCODING="utf-8")
        }
        if sys.platform == "win32":
            popen_kwargs["creationflags"] = 0x00000200 | 0x08000000
        else:
            popen_kwargs["start_new_session"] = True

        proc = subprocess.Popen(
            [python_path, translate_script],
            **popen_kwargs
        )
        proc.stdin.write(JSON_Encoder().encode(payload))
        proc.stdin.close()
        print(f"[JOB 2: STRUCT] Successfully triggered Job 3 (Translate) with PID {proc.pid}", flush=True)

    except Exception as trigger_err:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [CRITICAL] Failed to trigger Job 3: {trigger_err}")
        update_job_status(job_id, "failed", "struct", 55, logs, processed_pages, total_pages, False, is_local, **metadata)
        sys.exit(1)

if __name__ == "__main__":
    main()
