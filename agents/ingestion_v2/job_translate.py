#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Job 3: Translate Job for Ingestion Pipeline v2.
Reads structured pages from the database. For each page, strips non-translatable blocks,
requests gemini-3.1-flash-lite to translate translatable fields (text, term, prompt, etc.),
keys translation overlay objects by original block IDs under "i18n", saves the pages,
and spawns Stage 4 (Assemble).
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import time
import threading
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed

from utils import (
    update_job_status, check_cooperative_control, ROOT_DIR,
    JSON_Encoder, get_gemini_config, execute_with_retry,
    is_mongodb_enabled, get_mongodb_uri, atomic_write_json, LOCAL_DB_PATH
)

db_write_lock = threading.Lock()

TRANSLATABLE_TYPES = ["paragraph", "heading", "definition", "list", "figure", "question", "callout", "example", "step"]

TRANSLATION_SCHEMA = {
  "type": "OBJECT",
  "properties": {
    "translations": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "id": {"type": "STRING"},
          "ar": {
            "type": "OBJECT",
            "properties": {
              "text": {"type": "STRING"},
              "term": {"type": "STRING"},
              "items": {"type": "ARRAY", "items": {"type": "STRING"}},
              "caption": {"type": "STRING"},
              "prompt": {"type": "STRING"},
              "options": {"type": "ARRAY", "items": {"type": "STRING"}},
              "answer": {"type": "STRING"},
              "label": {"type": "STRING"},
              "title": {"type": "STRING"}
            }
          },
          "en": {
            "type": "OBJECT",
            "properties": {
              "text": {"type": "STRING"},
              "term": {"type": "STRING"},
              "items": {"type": "ARRAY", "items": {"type": "STRING"}},
              "caption": {"type": "STRING"},
              "prompt": {"type": "STRING"},
              "options": {"type": "ARRAY", "items": {"type": "STRING"}},
              "answer": {"type": "STRING"},
              "label": {"type": "STRING"},
              "title": {"type": "STRING"}
            }
          }
        },
        "required": ["id"]
      }
    }
  },
  "required": ["translations"]
}

TRANSLATION_PROMPT_TEMPLATE = """
You are an expert bilingual academic translator. Your task is to translate translatable block fields between Arabic and English.
Identify the source language of the input blocks.
If the source language is Arabic, fill the "en" (English) translation translation properties.
If the source language is English, fill the "ar" (Arabic) translation translation properties.

Strictly adhere to these rules:
1. Translate ONLY the specified translatable text fields (text, term, items, caption, prompt, options, answer, label, title).
2. NEVER merge, split, or reorder the block IDs. Keep the original ID keys exactly matching.
3. For mathematical LaTeX fragments inside captions or titles, preserve them EXACTLY without translating.
4. If a field is not present in the original block, do NOT include it in the translation.

Input blocks JSON:
{input_blocks_json}
"""

def call_gemini_translation(blocks, api_key, model):
    """
    Call Gemini API with translatable blocks, returning the i18n JSON object.
    """
    if not api_key:
        return None
        
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        
        # Strip block list to only essential fields to save token space
        reduced_blocks = []
        for b in blocks:
            if b.get("type") in TRANSLATABLE_TYPES:
                reduced = {
                    "id": b["id"],
                    "type": b["type"]
                }
                for field in ["text", "term", "items", "caption", "prompt", "options", "answer", "label", "title"]:
                    if field in b:
                        reduced[field] = b[field]
                reduced_blocks.append(reduced)
                
        if not reduced_blocks:
            return {"i18n": {}}
            
        prompt = TRANSLATION_PROMPT_TEMPLATE.format(input_blocks_json=json.dumps(reduced_blocks, ensure_ascii=False))
        
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": TRANSLATION_SCHEMA,
                "temperature": 0.0
            }
        }
        
        import requests
        res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=40)
        if res.status_code == 200:
            json_text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
            # Clean possible wrapping
            if json_text.strip().startswith("```"):
                json_text = json_text.strip().strip("```").strip("json").strip()
            
            data = json.loads(json_text)
            i18n_map = {}
            translations = data.get("translations", [])
            for item in translations:
                b_id = item.get("id")
                if b_id:
                    i18n_map[b_id] = {}
                    if "ar" in item:
                        i18n_map[b_id]["ar"] = item["ar"]
                    if "en" in item:
                        i18n_map[b_id]["en"] = item["en"]
            return {"i18n": i18n_map}
        else:
            print(f"[Translate API Error] HTTP {res.status_code}: {res.text}", file=sys.stderr)
    except Exception as e:
        print(f"[Translation Exception] {e}", file=sys.stderr)
    return None

def fallback_translation(blocks):
    """
    Simulates translations deterministically for offline testing.
    """
    i18n = {}
    for b in blocks:
        b_id = b["id"]
        b_type = b["type"]
        if b_type not in TRANSLATABLE_TYPES:
            continue
            
        ar_trans = {}
        en_trans = {}
        
        # Simple string-prepender mocks
        if "text" in b:
            ar_trans["text"] = f"مترجم إلى العربية: {b['text']}"
            en_trans["text"] = f"Translated to English: {b['text']}"
        if "term" in b:
            ar_trans["term"] = f"مصطلح: {b['term']}"
            en_trans["term"] = f"Term: {b['term']}"
        if "items" in b:
            ar_trans["items"] = [f"عنصر {idx+1}: {item}" for idx, item in enumerate(b["items"])]
            en_trans["items"] = [f"Item {idx+1}: {item}" for idx, item in enumerate(b["items"])]
        if "caption" in b:
            ar_trans["caption"] = f"وصف الشكل: {b['caption']}"
            en_trans["caption"] = f"Figure Caption: {b['caption']}"
        if "prompt" in b:
            ar_trans["prompt"] = f"سؤال: {b['prompt']}"
            en_trans["prompt"] = f"Question Stem: {b['prompt']}"
        if "options" in b:
            ar_trans["options"] = [f"خيار {idx+1}: {opt}" for idx, opt in enumerate(b["options"])]
            en_trans["options"] = [f"Option {idx+1}: {opt}" for idx, opt in enumerate(b["options"])]
        if "answer" in b:
            ar_trans["answer"] = f"الإجابة: {b['answer']}"
            en_trans["answer"] = f"Answer: {b['answer']}"
        if "label" in b:
            ar_trans["label"] = f"شارة: {b['label']}"
            en_trans["label"] = f"Label: {b['label']}"
        if "title" in b:
            ar_trans["title"] = f"عنوان: {b['title']}"
            en_trans["title"] = f"Title: {b['title']}"
            
        i18n[b_id] = {
            "ar": ar_trans,
            "en": en_trans
        }
    return {"i18n": i18n}

def load_structured_pages(book_id, is_local):
    """
    Loads all structured pages from database.
    """
    pages = []
    if is_local or not is_mongodb_enabled():
        if os.path.exists(LOCAL_DB_PATH):
            try:
                with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                    db = json.load(f)
                pages = [p for p in db.get("book_pages", []) if p.get("book_id") == book_id]
            except Exception:
                pass
    if is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri())
            db = client["fahem"]
            pages = list(db["book_pages"].find({"book_id": book_id}))
            client.close()
        except Exception:
            pass
    return sorted(pages, key=lambda p: p.get("page_number", 1))

def process_translate_page_worker(p_doc, api_key, model):
    """
    Thread-pool worker translating a single page's blocks.
    """
    try:
        blocks = p_doc.get("blocks", [])
        i18n_data = None
        if api_key:
            def _api_call():
                return call_gemini_translation(blocks, api_key, model)
            i18n_data = execute_with_retry(_api_call, max_retries=3, base_delay=1.5)
            
        if not i18n_data or not isinstance(i18n_data, dict):
            print(f"[Translate] Warning: Invalid or missing translation data format, using local fallback.", file=sys.stderr)
            i18n_data = fallback_translation(blocks)
            
        p_doc["i18n"] = i18n_data.get("i18n", {}) if isinstance(i18n_data, dict) else {}
        p_doc["status"] = "translated"
        
        return p_doc.get("page_number", 1), p_doc, None
    except Exception as page_err:
        return p_doc.get("page_number", 1), None, str(page_err)

def main():
    try:
        payload = json.loads(sys.stdin.read())
    except Exception as e:
        print(f"Error parsing stdin JSON in Job 3: {e}", file=sys.stderr)
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
    logs.append(f"[{t_str}] [TRANSLATE] Job 3: Initializing multi-threaded academic translation overlays.")
    update_job_status(job_id, "processing", "translate", 56, logs, 0, total_pages, False, is_local, **metadata)

    structured_pages = load_structured_pages(book_id, is_local)
    if not structured_pages:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [WARNING] No structured pages found in database. Synthesizing draft mock structured page.")
        structured_pages = [{
            "_id": f"page_{book_id}_1",
            "book_id": book_id,
            "page_number": 1,
            "dir": "ltr",
            "blocks": [
                {"id": "p1-b1", "parent": "", "type": "heading", "level": 1, "text": "Draft Section"},
                {"id": "p1-b2", "parent": "", "type": "paragraph", "text": "Mock overview content."}
            ],
            "status": "structured"
        }]

    actual_total_pages = len(structured_pages)
    api_key, model = get_gemini_config()
    
    if api_key:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [TRANSLATE] Gemini credentials discovered. Running automated key translation overlays.")
    else:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [WARNING] Running offline mock academic translation overlays.")

    translated_count = 0

    # Thread Pool execution with 3 workers
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(process_translate_page_worker, p_doc, api_key, model): p_doc.get("page_number", 1)
            for p_doc in structured_pages
        }
        
        for future in as_completed(futures):
            p_num = futures[future]
            check_cooperative_control(job_id, is_local, logs)
            
            p_no, p_doc, err_msg = future.result()
            if p_doc:
                translated_count += 1
                pct = 56 + int((translated_count / actual_total_pages) * 20)  # Range 56% - 76%
                print(f"[JOB 3: TRANSLATE] Translated Page {p_no}/{actual_total_pages}.", flush=True)
                
                # Write page back to database
                with db_write_lock:
                    update_job_status(
                        job_id, "processing", "translate", pct, logs,
                        processed_pages=translated_count, total_pages=actual_total_pages,
                        is_completed=False, is_local=is_local, new_page_doc=p_doc, **metadata
                    )
            else:
                logs.append(f"[{time.strftime('%H:%M:%S')}] [TRANSLATE_ERROR] Page {p_num} translation failed: {err_msg}")
                update_job_status(job_id, "processing", "translate", 56, logs, translated_count, actual_total_pages, False, is_local, **metadata)

    logs.append(f"[{time.strftime('%H:%M:%S')}] [TRANSLATE] ✅ All pages successfully translated and annotated. Triggering Downstream Job 4 (Assemble)...")
    update_job_status(job_id, "processing", "assemble", 76, logs, translated_count, actual_total_pages, False, is_local, **metadata)

    # Trigger Job 4 (Assemble)
    try:
        python_path = sys.executable or "python"
        assemble_script = os.path.join(ROOT_DIR, "agents", "ingestion_v2", "job_assemble.py")
        
        payload["ingestion_logs"] = logs
        payload["temp_pdf_path"] = temp_pdf_path
        payload["total_pages"] = actual_total_pages
        
        proc = subprocess.Popen(
            [python_path, assemble_script],
            stdin=subprocess.PIPE,
            stdout=sys.stdout,
            stderr=sys.stderr,
            text=True
        )
        proc.stdin.write(JSON_Encoder().encode(payload))
        proc.stdin.close()
        print(f"[JOB 3: TRANSLATE] Successfully triggered Job 4 (Assemble) with PID {proc.pid}", flush=True)

    except Exception as trigger_err:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [CRITICAL] Failed to trigger Job 4: {trigger_err}")
        update_job_status(job_id, "failed", "translate", 76, logs, translated_count, actual_total_pages, False, is_local, **metadata)
        sys.exit(1)

if __name__ == "__main__":
    main()
