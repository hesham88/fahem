#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Trigger script to clear old/mock pages and start the high-fidelity
asynchronous modular ingestion pipeline for the Python textbook.
"""

import os
import sys
import json
import subprocess
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
LOCAL_DB_PATH = os.path.join(ROOT_DIR, "web", "src", "app", "api", "local_db.json")

def main():
    print("=== INITIALIZING PYTHON TEXTBOOK HIGH-FIDELITY INGESTION ===")
    
    book_id = "book_introduction_to_python_programming_web_1780593796352"
    pdf_path = os.path.join(ROOT_DIR, "ignore", "temp_book_introduction_to_python_programming_web_1780593796352.pdf")
    
    if not os.path.exists(pdf_path):
        print(f"[ERROR] Target textbook PDF not found at: {pdf_path}")
        sys.exit(1)
        
    print(f"[SUCCESS] PDF file verified at: {pdf_path}")
    print(f"File size: {os.path.getsize(pdf_path) / (1024*1024):.2f} MB")
    
    # 1. Clear old pages & mock pages from local_db.json
    if os.path.exists(LOCAL_DB_PATH):
        try:
            with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                db = json.load(f)
            
            # Clear book pages
            pages = db.get("book_pages", [])
            initial_count = len(pages)
            filtered_pages = [p for p in pages if p.get("book_id") != book_id]
            removed_count = initial_count - len(filtered_pages)
            db["book_pages"] = filtered_pages
            print(f"[LOCAL DB] Removed {removed_count} old/mock pages for book {book_id}.")
            
            # Reset book status to processing/queued
            books = db.get("books", [])
            for b in books:
                if b.get("_id") == book_id:
                    b["ingestion_status"] = "processing"
                    b["ingestion_progress"] = 0
                    b["processed_pages"] = 0
                    b["is_completed"] = False
                    b["is_processed"] = False
                    b["is_extracted"] = False
                    b["is_indexed"] = False
                    b["is_vectored"] = False
                    b["is_embedded"] = False
                    b["is_analyzed"] = False
                    b["last_processed_page"] = 0
                    b["extracted_pages_count"] = 0
                    b["updated_at"] = time.time()
                    print(f"[LOCAL DB] Reset book metadata status in books collection.")
                    break
            
            # Atomic write back to local_db.json
            import tempfile
            dir_name = os.path.dirname(LOCAL_DB_PATH)
            with tempfile.NamedTemporaryFile('w', dir=dir_name, delete=False, encoding='utf-8') as tf:
                json.dump(db, tf, indent=2, ensure_ascii=False)
                temp_name = tf.name
            os.replace(temp_name, LOCAL_DB_PATH)
            print("[LOCAL DB] Database state flushed successfully.")
            
        except Exception as e:
            print(f"[ERROR] Failed to prepare local DB: {e}")
            sys.exit(1)
            
    # 2. Prepare payload
    payload = {
        "book_id": book_id,
        "temp_pdf_path": pdf_path,
        "is_local": True,
        "title": "Introduction_to_Python_Programming-WEB",
        "title_ar": "Introduction_to_Python_Programming-WEB",
        "subject_id": "subj_user_uploads",
        "grade": "General",
        "term": "Term 1",
        "year": "2026",
        "language": "ar",
        "book_type": "core",
        "userId": "GLzPguiY29eSHKj0jLPa8FwB4em2"
    }
    
    # 3. Trigger Job 2 (OCR/Extract) which will extract and cascade to Job 3 (Embed) and Job 4 (Finalize)
    ocr_script = os.path.join(ROOT_DIR, "scripts", "ingestion", "job_ocr.py")
    python_path = sys.executable or "python"
    
    print(f"\n[SPAWN] Executing high-fidelity ingestion pipeline starting with OCR Job...")
    print(f"Command: {python_path} {ocr_script}")
    
    proc = subprocess.Popen(
        [python_path, ocr_script],
        stdin=subprocess.PIPE,
        stdout=sys.stdout,
        stderr=sys.stderr,
        text=True,
        cwd=os.path.join(ROOT_DIR, "scripts", "ingestion")
    )
    
    proc.stdin.write(json.dumps(payload))
    proc.stdin.close()
    
    print(f"[SPAWN] Ingestion process started successfully with PID {proc.pid}. Waiting for entire cascade pipeline to complete...", flush=True)
    proc.wait()
    print("[SPAWN] Ingestion pipeline cascade completed successfully!")

if __name__ == "__main__":
    main()
