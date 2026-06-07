#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Job 1: Fetch/Harvest Job for Ingestion Pipeline v2.
Responsible for progressive downloads from URLs, PDF signature validation, and capturing native Bookmarks TOC.
Caches/saves file locally and signals downstream block extraction (Job 2: Struct).
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
import requests
import subprocess
import fitz  # PyMuPDF

from utils import (
    update_job_status, check_cooperative_control, ROOT_DIR,
    JSON_Encoder, is_mongodb_enabled, get_mongodb_uri, make_progress_bar
)

def download_file_progressive(url, output_path, job_id, is_local, logs, metadata):
    def add_log(msg, progress_val=15):
        t = time.strftime("%H:%M:%S")
        logs.append(f"[{t}] [DOWNLOAD] {msg}")
        update_job_status(job_id, "processing", "fetch", progress_val, logs, 0, 0, False, is_local, **metadata)

    add_log(f"Connecting to source URL: {url}", progress_val=5)
    res = requests.get(url, stream=True, timeout=40)
    res.raise_for_status()
    
    total_size = int(res.headers.get('content-length', 0))
    downloaded = 0
    
    with open(output_path, "wb") as f:
        for chunk in res.iter_content(chunk_size=128 * 1024):
            check_cooperative_control(job_id, is_local, logs)
            if chunk:
                f.write(chunk)
                downloaded += len(chunk)
                if total_size > 0:
                    pct = (downloaded / total_size) * 100
                    # Map 0-100% download to 5-20% overall progress
                    current_prog = 5.0 + (pct / 100.0) * 15.0
                    if downloaded % (512 * 1024) == 0:
                        bar = make_progress_bar(pct, width=20)
                        add_log(f"{bar} Downloaded {downloaded / (1024*1024):.2f}MB / {total_size / (1024*1024):.2f}MB", progress_val=round(current_prog, 1))

    add_log("Textbook PDF binary download finished successfully.", progress_val=20)

def main():
    try:
        payload = json.loads(sys.stdin.read())
    except Exception as e:
        print(f"Error parsing stdin JSON: {e}", file=sys.stderr)
        sys.exit(1)

    book_id = payload.get("book_id")
    subject_id = payload.get("subject_id", "subj_user_uploads")
    title = payload.get("title", "Untitled Document")
    title_ar = payload.get("title_ar", title)
    source_url = payload.get("source_url")
    storage_path = payload.get("storage_path")
    grade = payload.get("grade", "General")
    term = payload.get("term", "Term 1")
    year = payload.get("year", "2026")
    language = payload.get("language", "ar")
    book_type = payload.get("book_type", "core")
    user_id = payload.get("userId")
    is_local = payload.get("is_local", True)

    job_id = f"job_{book_id}"
    logs = [
        f"[{time.strftime('%H:%M:%S')}] [INIT] 🚀 Ingestion Pipeline v2 (Vision-First, Typed-Block) Spawning."
    ]

    metadata = {
        "book_id": book_id,
        "subject_id": subject_id,
        "title": title,
        "title_ar": title_ar,
        "source_url": source_url,
        "storage_path": storage_path,
        "grade": grade,
        "term": term,
        "year": year,
        "language": language,
        "book_type": book_type,
        "userId": user_id
    }

    print(f"[JOB 1: FETCH] Starting fetch for book {book_id} (V2) ...", flush=True)
    update_job_status(job_id, "processing", "fetch", 5, logs, 0, 0, False, is_local, **metadata)

    temp_pdf_path = os.path.join(ROOT_DIR, "ignore", f"temp_{book_id}.pdf")
    os.makedirs(os.path.dirname(temp_pdf_path), exist_ok=True)

    try:
        # 1. Fetch source
        if source_url and source_url.startswith("http"):
            try:
                download_file_progressive(source_url, temp_pdf_path, job_id, is_local, logs, metadata)
            except Exception as dl_err:
                logs.append(f"[{time.strftime('%H:%M:%S')}] [DOWNLOAD] ⚠️ Progressive download failed: {dl_err}. Trying fallback...")
                update_job_status(job_id, "processing", "fetch", 18, logs, 0, 0, False, is_local, **metadata)
                
                res = requests.get(source_url, timeout=35)
                res.raise_for_status()
                with open(temp_pdf_path, "wb") as f:
                    f.write(res.content)
                logs.append(f"[{time.strftime('%H:%M:%S')}] [DOWNLOAD] Fallback download completed.")
        else:
            if storage_path and os.path.exists(os.path.join(ROOT_DIR, "ignore", os.path.basename(storage_path))):
                local_uploaded_path = os.path.join(ROOT_DIR, "ignore", os.path.basename(storage_path))
                import shutil
                shutil.copy(local_uploaded_path, temp_pdf_path)
                logs.append(f"[{time.strftime('%H:%M:%S')}] [INIT] Local uploaded file found at {local_uploaded_path}. Copied to sandbox.")
            else:
                ingest_mock = os.environ.get("INGEST_MOCK", "false").lower() in ("true", "1") or payload.get("INGEST_MOCK", False)
                if ingest_mock:
                    logs.append(f"[{time.strftime('%H:%M:%S')}] [INIT] File path missing or offline, copying mock PDF with real pages since INGEST_MOCK=true.")
                    update_job_status(job_id, "processing", "fetch", 20, logs, 0, 0, False, is_local, **metadata)
                    time.sleep(1.0)
                    
                    # Copy an existing small test PDF if available
                    mock_src = os.path.join(ROOT_DIR, "ignore", "temp_test_book_1.pdf")
                    if not os.path.exists(mock_src):
                        mock_src = os.path.join(ROOT_DIR, "ignore", "temp_test_e2e_book_manual_1.pdf")
                    
                    if os.path.exists(mock_src):
                        import shutil
                        shutil.copy(mock_src, temp_pdf_path)
                        logs.append(f"[{time.strftime('%H:%M:%S')}] [INIT] Successfully copied mock PDF from {os.path.basename(mock_src)}.")
                    else:
                        # Fallback to plain text dummy if none found
                        with open(temp_pdf_path, "w", encoding="utf-8") as f:
                            f.write("Placeholder textbook data for V2 local validation.\n")
                else:
                    err_msg = "Resource file path is missing, offline, or unavailable, and INGEST_MOCK is false."
                    logs.append(f"[{time.strftime('%H:%M:%S')}] [INIT] ❌ Critical Fetch Error: {err_msg}")
                    raise FileNotFoundError(err_msg)

        # 2. Extract Native Bookmarks (TOC) using PyMuPDF
        pdf_toc = []
        try:
            doc = fitz.open(temp_pdf_path)
            page_count = len(doc)
            pdf_toc = doc.get_toc()
            doc.close()
            logs.append(f"[{time.strftime('%H:%M:%S')}] [TOC] Native PDF opened. Total Pages: {page_count}. Native Bookmark entries found: {len(pdf_toc)}")
        except Exception as pdf_err:
            err_msg = f"Failed to open or parse PDF file structure: {pdf_err}"
            logs.append(f"[{time.strftime('%H:%M:%S')}] [TOC] ❌ Critical: {err_msg}")
            raise RuntimeError(err_msg)

        metadata["total_pages"] = page_count
        payload["total_pages"] = page_count
        payload["pdf_toc"] = pdf_toc
        payload["temp_pdf_path"] = temp_pdf_path
        payload["ingestion_logs"] = logs

        meta_copy = metadata.copy()
        meta_copy.pop("total_pages", None)

        logs.append(f"[{time.strftime('%H:%M:%S')}] [DOWNLOAD] ✅ Fetch completed. Triggering Downstream Job 2 (Struct: Vision Block Extraction)...")
        update_job_status(job_id, "processing", "struct", 25, logs, 0, page_count, False, is_local, **meta_copy)
        # 3. Trigger Job 2: Struct (Vision Block Extraction)
        try:
            python_path = sys.executable or "python"
            SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
            struct_script = os.path.join(SCRIPT_DIR, "job_struct.py")
            
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
                # CREATE_NEW_PROCESS_GROUP = 0x00000200
                # CREATE_NO_WINDOW = 0x08000000
                popen_kwargs["creationflags"] = 0x00000200 | 0x08000000
            else:
                popen_kwargs["start_new_session"] = True

            proc = subprocess.Popen(
                [python_path, struct_script],
                **popen_kwargs
            )
            proc.stdin.write(JSON_Encoder().encode(payload))
            proc.stdin.close()
            print(f"[JOB 1: FETCH] Successfully triggered Job 2 (Struct) with PID {proc.pid}", flush=True)

        except Exception as trigger_err:
            logs.append(f"[{time.strftime('%H:%M:%S')}] [CRITICAL] Failed to trigger Job 2: {trigger_err}")
            update_job_status(job_id, "failed", "fetch", 25, logs, 0, page_count, False, is_local, **meta_copy)
            sys.exit(1)

    except Exception as e:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [CRITICAL] Fetch error: {e}")
        meta_copy = metadata.copy()
        meta_copy.pop("total_pages", None)
        update_job_status(job_id, "failed", "fetch", 25, logs, 0, 0, False, is_local, **meta_copy)
        sys.exit(1)

if __name__ == "__main__":
    main()
