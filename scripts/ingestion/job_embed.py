#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Job 3: Vector Embeddings & Rule Extraction Job.
Reads transient chunk drafts from database. For each page, extracts rules/formulas,
computes Gemini-004 vector embeddings, saves final pages, and triggers DB finalizer (Job 4).
"""

import os
import sys
import json
import time
import re
import subprocess
from utils import (
    update_job_status, check_cooperative_control, get_mongodb_uri, 
    LOCAL_DB_PATH, get_gemini_embedding, ROOT_DIR, is_mongodb_enabled
)

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
        # Fallback/Production MongoDB read
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
    logs.append(f"[{t_str}] [VECTOR_INDEX] Job 3: Loading draft chunks and initializing semantic embeddings pipeline.")
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
    api_key = os.environ.get("GEMINI_API_KEY")

    # Regular expressions for mathematical rules, definitions, laws or formulas
    formula_regex = re.compile(r'([A-Za-z0-9_\-\+\*/\s\(\)\^=]{3,20}=[A-Za-z0-9_\-\+\*/\s\(\)\^=]{3,20})')
    rule_keywords = ["law", "rule", "theorem", "قانون", "نظرية", "تعريف", "مفهوم", "خلاصة"]

    try:
        # Loop through pages, vectorize, extract equations/highlights and write page docs
        for idx, chunk in enumerate(draft_chunks):
            # Cooperative control check
            check_cooperative_control(job_id, is_local, logs)
            
            page_num = chunk.get("page_number", idx + 1)
            text = chunk.get("content", "")
            
            # 1. Rule & Formula Analysis
            formulas_found = []
            rules_found = []
            
            for match in formula_regex.finditer(text):
                f_str = match.group(1).strip()
                if len(f_str) > 4 and any(op in f_str for op in ["=", "+", "-", "*", "/"]):
                    formulas_found.append(f_str)
                    
            for line in text.split("\n"):
                if any(kw in line.lower() for kw in rule_keywords):
                    rules_found.append(line.strip())

            # Log any interesting highlights
            if rules_found and len(rules_found[0]) > 5:
                logs.append(f"[{time.strftime('%H:%M:%S')}] [INDEX] Page {page_num} Concept Highlighted: \"{rules_found[0][:60]}...\"")
            if formulas_found:
                logs.append(f"[{time.strftime('%H:%M:%S')}] [INDEX] Page {page_num} Formula Extracted: {formulas_found[0]}")

            # 2. Compute Embedding
            embedding = get_gemini_embedding(text, api_key)
            
            page_doc = {
                "_id": f"page_{book_id}_{page_num}",
                "book_id": book_id,
                "page_number": page_num,
                "content": text,
                "embedding": embedding,
                "rules": rules_found,
                "formulas": formulas_found,
                "userId": payload.get("userId")
            }

            # 3. Calculate progressive percentage (maps from 51% to 90%)
            pct = 51 + int(( (idx + 1) / actual_total_pages ) * 39)
            
            t_str_page = time.strftime("%H:%M:%S")
            logs.append(f"[{t_str_page}] [VECTOR_INDEX] Embedded and page-indexed page {page_num}/{actual_total_pages}.")
            
            update_job_status(
                job_id, "processing", "embed", pct, logs, 
                processed_pages=page_num, total_pages=actual_total_pages, 
                is_completed=False, is_local=is_local, new_page_doc=page_doc, **metadata
            )
            
            # Throttling rate limit delay
            time.sleep(0.12)

        # Vectorization step finished!
        logs.append(f"[{time.strftime('%H:%M:%S')}] [VECTOR_INDEX] ✅ Semantic text grounding node generation completed. Starting Job 4: DB Finalizer...")
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
            print(f"[JOB 3: EMBED] Successfully triggered Job 4 (Finalize) with PID {proc.pid}", flush=True)

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
