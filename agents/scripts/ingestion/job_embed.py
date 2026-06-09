#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Job 3: Vector Embeddings & Gemini-Augmented Page Layout Structuring Job.
Reads transient chunk drafts from database. For each page, calls Gemini to extract formulas,
rules, tips, and format the layout elegantly in both English and Arabic (multilingual),
computes vector embeddings, saves final pages in parallel, and triggers DB finalizer (Job 4).
"""

import os
import sys
import json
import time
import re
import random
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

from utils import (
    update_job_status, check_cooperative_control, get_mongodb_uri, 
    LOCAL_DB_PATH, get_gemini_embedding, ROOT_DIR, is_mongodb_enabled
)

# Thread-safe database write lock
db_write_lock = threading.Lock()

def get_gemini_config():
    """
    Retrieves Gemini key and model from environment or ignore/gemini_secrets.json.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    try:
        secrets_path = os.path.join(ROOT_DIR, "ignore", "gemini_secrets.json")
        if os.path.exists(secrets_path):
            with open(secrets_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if not api_key:
                    api_key = data.get("GEMINI_API_KEY")
                if not os.environ.get("GEMINI_MODEL"):
                    model = data.get("GEMINI_MODEL", "gemini-2.5-flash")
    except Exception as e:
        print(f"[Config Error] Could not load gemini_secrets.json: {e}", file=sys.stderr)
    return api_key, model

def execute_with_retry(func, *args, max_retries=5, base_delay=2.0, **kwargs):
    """
    Helper function to run functions with exponential backoff and jitter.
    """
    delay = base_delay
    for attempt in range(max_retries):
        try:
            result = func(*args, **kwargs)
            if result is not None:
                return result
        except Exception as e:
            print(f"[RETRY] Error in {func.__name__} (attempt {attempt+1}/{max_retries}): {e}", file=sys.stderr)
        
        # Exponential backoff with jitter
        sleep_time = delay + random.uniform(0.5, 1.5)
        print(f"[RETRY] Sleeping for {sleep_time:.2f} seconds before retry...", file=sys.stderr)
        time.sleep(sleep_time)
        delay *= 2.0
    return None

def get_gemini_embedding_with_retry(text, api_key):
    def _call():
        return get_gemini_embedding(text, api_key)
    return execute_with_retry(_call, max_retries=4, base_delay=1.5)

def annotate_page_with_gemini(text, api_key, model):
    """
    Call Gemini LLM to analyze raw PDF text block and output structured layout + translations.
    """
    if not api_key:
        return None
        
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        
        prompt = f"""
You are an expert textbook structuring and academic layout engine. Your job is to convert raw, unformatted PDF page text into a beautiful, structurally annotated Markdown format that will look stunning when rendered on the client side.

Input raw page text:
\"\"\"
{text}
\"\"\"

Follow these requirements strictly to produce professional-grade, unified academic output:
1. PARAGRAPH FLOW & LINE WRAPPING:
   - PDFs extract text with artificial, broken line breaks inside sentences. You MUST clean up these line breaks and join the sentences so they flow continuously and read naturally. Reconstruct paragraphs cleanly.
   - Do NOT keep raw PDF layout wraps. Join chopped sentences!

2. MULTI-LINGUAL UNIFICATION:
   - Identify the language of the input.
   - If the input is English:
     - "contentEn": Fully styled, layout-reconstructed Markdown in English.
     - "contentAr": A professional, high-fidelity academic translation of the exact same content into Arabic.
   - If the input is Arabic:
     - "contentAr": Fully styled, layout-reconstructed Arabic Markdown.
     - "contentEn": A professional, high-fidelity academic translation of the exact same content into English.
   - IMPORTANT: Both "contentEn" and "contentAr" MUST have identical layout structure, heading hierarchies, lists, tables, and special card markers (mirrored in their respective languages). Translate all content inside, but preserve all structural tags!

3. CARD AND BOX MARKERS (USE STRICT PREFIXES):
   - Rules, Definitions, Laws, Theorems, or Principles: Put on their own line prefixed by its name and a colon, e.g., "Definition: content..." or "تعريف: محتوى..." or "Law: content..." or "قانون: محتوى...". The client-side renders these with beautiful golden borders and cards.
   - Questions / Exercises / Practice Problems: Prefix them exactly as "Question: content..." or "سؤال: محتوى..." or "تمرين: محتوى...". The client-side renders these as active-recall question cards.
   - Formulas / Equations: Prefix them exactly on their own line starting with "Equation: equation..." or "معادلة: معادلة...". E.g., "Equation: E = m * c^2" or "معادلة: y = m * x + b". Make sure mathematical expressions are well-spaced, highly readable, and on their own separate line.
   - Code Blocks: If there is programming code (such as Python), format it inside clean Markdown code blocks with language specifiers and correct indentation:
     ```python
     # Python code here
     ```
     Ensure code blocks are completely clean and do not mix prose inside them.

4. PAGE LAYOUT META-TAGS (HEADER, FOOTER, VISUALS):
   - Headers: Add `[HEADER: Header content]` (such as Chapter or Subtopic Title) at the very beginning of both outputs.
   - Footers: Add `[FOOTER: Footer content]` (such as "Curriculum Standards" or page notes) at the very end of both outputs.
   - Visuals/Illustrations: If the raw text mentions diagrams, charts, graphs, figures, or illustrations, describe the visual content vividly and educationally inside a `[VISUAL: Detailed, premium description of the visual element]` block.

5. RICH TEXT STYLING:
   - Bold headers: Use `#`, `##`, `###`, `####` cleanly for outline hierarchies. Enforce standard, highly-organized markdown heading structures.
   - Highlight keywords: Wrap critical academic terms, definitions, formulas, or concepts in double equals sign: ==highlighted term== (e.g., ==dynamic typing== or ==مفسر بايثون==). This highlights them beautifully in the page viewer.
   - Lists: Use `-` or `*` or numbered lists for clean bullet points.
   - Tables: Format tables or raw data grids as beautiful Markdown tables with headers (e.g. `| Header 1 | Header 2 |`).

6. EXTRACTED DATA FIELDS:
   - "formulas": An array of standalone math/physics equations or programming formulas found on this page (each formula as a clean string).
   - "rules": An array of standalone theorems, definitions, concepts, or laws found on this page.
   - "tipAr": A helpful, short Arabic study tip or active-recall cue for this page (1-2 sentences).
   - "tipEn": A helpful, short English study tip or active-recall cue for this page (1-2 sentences).
   - "pageTopicAr": A highly descriptive title or topic for THIS specific page in Arabic (e.g., "7.1 أساسيات الوحدات" or "مفهوم المصفوفات"). Do NOT repeat the general chapter title if a page-specific sub-topic is present. Max 5-7 words.
   - "pageTopicEn": A highly descriptive title or topic for THIS specific page in English (e.g., "7.1 Module Basics" or "Concept of Matrices"). Do NOT repeat the general chapter title if a page-specific sub-topic is present. Max 5-7 words.
   - "chapterTitleAr": The unit or chapter title this page belongs to (in Arabic). If not found, use a reasonable general title.
   - "chapterTitleEn": The unit or chapter title this page belongs to (in English). If not found, use a reasonable general title.

Output a strictly formatted JSON object with the following fields:
{{
  "contentAr": "string",
  "contentEn": "string",
  "formulas": ["string"],
  "rules": ["string"],
  "tipAr": "string",
  "tipEn": "string",
  "pageTopicAr": "string",
  "pageTopicEn": "string",
  "chapterTitleAr": "string",
  "chapterTitleEn": "string"
}}

Respond with the JSON object ONLY. Do NOT wrap it in any markdown backticks. Ensure it is completely valid JSON, escaping all quotes and backslashes properly inside string values.
"""

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=55)
        if res.status_code == 200:
            res_json = res.json()
            parts = res_json.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])
            if parts:
                res_text = parts[0].get("text", "").strip()
                if res_text.startswith("```"):
                    res_text = re.sub(r"^```(?:json)?\n", "", res_text)
                    res_text = re.sub(r"\n```$", "", res_text)
                return json.loads(res_text.strip())
    except Exception as e:
        print(f"[Gemini Error] Annotation call failed: {e}", file=sys.stderr)
    return None

def annotate_page_with_gemini_with_retry(text, api_key, model):
    def _call():
        return annotate_page_with_gemini(text, api_key, model)
    return execute_with_retry(_call, max_retries=4, base_delay=2.0)

def fallback_page_processing(text, book_title, is_arabic):
    """
    Robust fallback parsing when Gemini is unavailable or fails.
    """
    formula_regex = re.compile(r'([A-Za-z0-9_\-\+\*/\s\(\)\^=]{3,20}=[A-Za-z0-9_\-\+\*/\s\(\)\^=]{3,20})')
    rule_keywords = ["law", "rule", "theorem", "قانون", "نظرية", "تعريف", "مفهوم", "خلاصة"]
    
    formulas_found = []
    rules_found = []
    
    for match in formula_regex.finditer(text):
        f_str = match.group(1).strip()
        if len(f_str) > 4 and any(op in f_str for op in ["=", "+", "-", "*", "/"]):
            formulas_found.append(f_str)
            
    for line in text.split("\n"):
        if any(kw in line.lower() for kw in rule_keywords):
            rules_found.append(line.strip())
            
    return {
        "contentAr": text if is_arabic else f"ترجمة مبدئية:\n{text}",
        "contentEn": text if not is_arabic else f"Draft Translation:\n{text}",
        "formulas": formulas_found,
        "rules": rules_found,
        "tipAr": "تلميح: راجع المفاهيم المذكورة في هذه الصفحة لترسيخ فهمك.",
        "tipEn": "Tip: Review the concepts on this page to reinforce your understanding.",
        "chapterTitleAr": "عام",
        "chapterTitleEn": "General"
    }

def load_draft_chunks(book_id, is_local):
    """
    Reads draft text chunks for this book from MongoDB or local_db.json.
    """
    chunks = []
    if is_local or not is_mongodb_enabled():
        if os.path.exists(LOCAL_DB_PATH):
            try:
                with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                    db = json.load(f)
                raw_chunks = db.get("ingestion_chunks_draft", [])
                chunks = [c for c in raw_chunks if c.get("book_id") == book_id]
                chunks.sort(key=lambda x: x.get("page_number", 0))
            except Exception as e:
                print(f"[JOB 3 Local Read Error] {e}", file=sys.stderr)
                
    if not chunks and is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri(), serverSelectionTimeoutMS=2000)
            db = client["fahem"]
            draft_docs = db["ingestion_chunks_draft"].find({"book_id": book_id}).sort("page_number", 1)
            chunks = list(draft_docs)
            client.close()
        except Exception as e:
            print(f"[JOB 3 Mongo Read Error] {e}", file=sys.stderr)
            
    return chunks

def process_single_page(chunk, idx, book_id, api_key, model, payload, is_book_arabic, existing_pages=None):
    """
    Worker task: Processes page text embedding & calls Gemini for multilingual annotations.
    """
    page_num = chunk.get("page_number", idx + 1)
    text = chunk.get("content", "")
    
    # Check if page is already processed in high-fidelity to enable resume-ability
    if existing_pages and page_num in existing_pages:
        print(f"[Worker] Page {page_num} already processed with high-fidelity. Skipping LLM/Embedding call.", flush=True)
        return page_num, existing_pages[page_num]
        
    # 1. Compute Embedding (with robust retry)
    embedding = get_gemini_embedding_with_retry(text, api_key)
    
    # 2. Compute Gemini Layout Annotations (with robust retry)
    annotation = None
    if api_key:
        annotation = annotate_page_with_gemini_with_retry(text, api_key, model)
        
    if not annotation:
        print(f"[Worker] Page {page_num} annotation failed. Running robust pattern fallback.", file=sys.stderr)
        annotation = fallback_page_processing(text, payload.get("title", ""), is_book_arabic)
        
    # Assemble structured page doc
    page_doc = {
        "_id": f"page_{book_id}_{page_num}",
        "book_id": book_id,
        "page_number": page_num,
        "content": text,
        "contentAr": annotation.get("contentAr", ""),
        "contentEn": annotation.get("contentEn", ""),
        "formulas": annotation.get("formulas", []),
        "rules": annotation.get("rules", []),
        "tipAr": annotation.get("tipAr", ""),
        "tipEn": annotation.get("tipEn", ""),
        "chapterTitleAr": annotation.get("chapterTitleAr", "عام"),
        "chapterTitleEn": annotation.get("chapterTitleEn", "General"),
        "titleEn": annotation.get("pageTopicEn") or annotation.get("chapterTitleEn") or f"Topic of Page {page_num}",
        "titleAr": annotation.get("pageTopicAr") or annotation.get("chapterTitleAr") or f"موضوع الصفحة {page_num}",
        "embedding": embedding,
        "userId": payload.get("userId")
    }
    
    return page_num, page_doc

def main():
    try:
        payload = json.loads(sys.stdin.read())
    except Exception as e:
        print(f"Error parsing stdin JSON in Job 3: {e}", file=sys.stderr)
        sys.exit(1)

    book_id = payload.get("book_id")
    is_local = payload.get("is_local", True)
    total_pages = payload.get("total_pages", 1)
    
    logs = payload.get("ingestion_logs", [])
    if not logs:
        logs = [f"[{time.strftime('%H:%M:%S')}] [INIT] Job 3: Vector Embeddings process spawned."]
        
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
    logs.append(f"[{t_str}] [VECTOR_INDEX] Job 3: Loading draft chunks and initializing multi-threaded semantic layout embeddings.")
    update_job_status(job_id, "processing", "embed", 51, logs, 0, total_pages, False, is_local, **metadata)

    draft_chunks = load_draft_chunks(book_id, is_local)
    if not draft_chunks:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [WARNING] No draft chunks found for book {book_id}. Synthesizing dynamic placeholder draft...")
        draft_chunks = [{
            "book_id": book_id,
            "page_number": 1,
            "content": f"Synthesized study guide for {payload.get('title')}."
        }]

    actual_total_pages = len(draft_chunks)
    
    # Load Gemini API Config
    api_key, model = get_gemini_config()
    is_book_arabic = metadata.get("language", "ar") == "ar"

    if api_key:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [VECTOR_INDEX] Loaded Gemini configuration. Model: '{model}'. Initiating parallel page analyzers.")
    else:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [WARNING] No Gemini API Key discovered. Running offline pattern text extraction fallback.")

    # Load existing high-fidelity pages from local_db.json or MongoDB to allow resuming
    existing_pages = {}
    if is_local or not is_mongodb_enabled():
        if os.path.exists(LOCAL_DB_PATH):
            try:
                with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                    db = json.load(f)
                p_docs = db.get("book_pages", [])
                for p in p_docs:
                    if p.get("book_id") == book_id:
                        # Make sure it's a real high-fidelity processed page
                        # A high-fidelity page has 'contentAr' and 'contentEn' and 'embedding'
                        if p.get("contentAr") and p.get("contentEn") and p.get("embedding"):
                            existing_pages[p.get("page_number")] = p
                if existing_pages:
                    logs.append(f"[{time.strftime('%H:%M:%S')}] [VECTOR_INDEX] Detected {len(existing_pages)} previously completed high-fidelity pages. Enabling quick-resume.")
            except Exception as e:
                print(f"[JOB 3 Local Resume Load Error] {e}", file=sys.stderr)
                
    if not existing_pages and is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri(), serverSelectionTimeoutMS=2000)
            db = client["fahem"]
            p_docs = db["book_pages"].find({"book_id": book_id})
            for p in p_docs:
                if p.get("contentAr") and p.get("contentEn") and p.get("embedding"):
                    existing_pages[p.get("page_number")] = p
            if existing_pages:
                logs.append(f"[{time.strftime('%H:%M:%S')}] [VECTOR_INDEX] Detected {len(existing_pages)} previously completed MongoDB high-fidelity pages. Enabling quick-resume.")
            client.close()
        except Exception as e:
            print(f"[JOB 3 Mongo Resume Load Error] {e}", file=sys.stderr)

    completed_pages = 0

    try:
        # We run the parallel page processing loop with ThreadPoolExecutor
        # max_workers=3 is highly efficient and safe from Gemini API rate limit blocks
        max_workers = 3 if api_key else 10
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = []
            for idx, chunk in enumerate(draft_chunks):
                future = executor.submit(
                    process_single_page, chunk, idx, book_id, api_key, model, payload, is_book_arabic, existing_pages
                )
                futures.append(future)

            for future in as_completed(futures):
                check_cooperative_control(job_id, is_local, logs)
                
                try:
                    page_num, page_doc = future.result()
                    completed_pages += 1
                    
                    # Progressive percentage maps from 51% to 90%
                    pct = 51 + int((completed_pages / actual_total_pages) * 39)
                    
                    t_str_page = time.strftime("%H:%M:%S")
                    log_msg = f"[{t_str_page}] [VECTOR_INDEX] Layout structured, embedded, and page-indexed page {page_num}/{actual_total_pages}."
                    
                    with db_write_lock:
                        logs.append(log_msg)
                        print(log_msg, flush=True)
                        
                        update_job_status(
                            job_id, "processing", "embed", pct, logs, 
                            processed_pages=completed_pages, total_pages=actual_total_pages, 
                            is_completed=False, is_local=is_local, new_page_doc=page_doc, **metadata
                        )
                except Exception as worker_err:
                    print(f"[Worker Fail] Page task failed: {worker_err}", file=sys.stderr)

        # Vectorization & annotation step finished!
        logs.append(f"[{time.strftime('%H:%M:%S')}] [VECTOR_INDEX] ✅ Multilingual semantic text grounding and layout annotation completed. Starting Job 4: DB Finalizer...")
        update_job_status(job_id, "processing", "finalize", 92, logs, actual_total_pages, actual_total_pages, False, is_local, **metadata)

        # Trigger Job 4 (Finalize)
        try:
            python_path = sys.executable or "python"
            finalize_script = os.path.join(ROOT_DIR, "scripts", "ingestion", "job_finalize.py")
            
            payload["total_pages"] = actual_total_pages
            payload["ingestion_logs"] = logs
            
            proc = subprocess.Popen(
                [python_path, finalize_script],
                stdin=subprocess.PIPE,
                stdout=sys.stdout,
                stderr=sys.stderr,
                text=True
            )
            proc.stdin.write(json.dumps(payload))
            proc.stdin.close()
            print(f"[JOB 3: EMBED] Successfully triggered Job 4 (Finalize) with PID {proc.pid}. Waiting for completion...", flush=True)
            proc.wait()

        except Exception as trigger_err:
            logs.append(f"[{time.strftime('%H:%M:%S')}] [CRITICAL] Failed to trigger Job 4: {trigger_err}")
            update_job_status(job_id, "failed", "embed", 92, logs, actual_total_pages, actual_total_pages, False, is_local, **metadata)
            sys.exit(1)

    except Exception as exc:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [CRITICAL] Job 3 Vectorization Crash: {exc}")
        update_job_status(job_id, "failed", "embed", 75, logs, 0, total_pages, False, is_local, **metadata)
        sys.exit(1)

if __name__ == "__main__":
    main()
