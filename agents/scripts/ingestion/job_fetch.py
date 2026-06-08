#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Job 1: Fetch/Harvest Job.
Responsible for polite downloads from URLs or ensuring uploaded file storage placement.
Caches/saves file locally and signals downstream OCR parsing (Job 2).
"""

import os
import sys
import json
import time
import requests
import subprocess
from utils import update_job_status, check_cooperative_control, ROOT_DIR

def download_file_progressive(url, output_path, job_id, is_local, logs, metadata):
    def add_log(msg):
        t = time.strftime("%H:%M:%S")
        logs.append(f"[{t}] [DOWNLOAD] {msg}")
        update_job_status(job_id, "processing", "fetch", 15, logs, 0, 0, False, is_local, **metadata)

    add_log(f"Connecting to source URL: {url}")
    res = requests.get(url, stream=True, timeout=40)
    res.raise_for_status()
    
    total_size = int(res.headers.get('content-length', 0))
    downloaded = 0
    
    with open(output_path, "wb") as f:
        for chunk in res.iter_content(chunk_size=128 * 1024):
            # cooperative check
            check_cooperative_control(job_id, is_local, logs)
            
            if chunk:
                f.write(chunk)
                downloaded += len(chunk)
                if total_size > 0:
                    pct = (downloaded / total_size) * 100
                    if downloaded % (512 * 1024) == 0:  # log every 512KB
                        add_log(f"Downloaded {downloaded / (1024*1024):.2f}MB / {total_size / (1024*1024):.2f}MB ({pct:.1f}%)")

    add_log("Textbook PDF binary download finished successfully.")

def main():
    try:
        # Read payload from stdin
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
        f"[{time.strftime('%H:%M:%S')}] [INIT] 🚀 Spawning Modular Ingestion Pipeline: Job 1 (Fetch)."
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

    print(f"[JOB 1: FETCH] Starting fetch for book {book_id} ...", flush=True)
    update_job_status(job_id, "processing", "fetch", 5, logs, 0, 0, False, is_local, **metadata)

    temp_pdf_path = os.path.join(ROOT_DIR, "ignore", f"temp_{book_id}.pdf")
    os.makedirs(os.path.dirname(temp_pdf_path), exist_ok=True)

    try:
        # 1. Fetch source
        if source_url and source_url.startswith("http"):
            try:
                download_file_progressive(source_url, temp_pdf_path, job_id, is_local, logs, metadata)
            except Exception as dl_err:
                t_str = time.strftime("%H:%M:%S")
                logs.append(f"[{t_str}] [DOWNLOAD] ⚠️ Progressive download failed: {dl_err}. Trying simple requests fallback...")
                update_job_status(job_id, "processing", "fetch", 18, logs, 0, 0, False, is_local, **metadata)
                
                res = requests.get(source_url, timeout=35)
                res.raise_for_status()
                with open(temp_pdf_path, "wb") as f:
                    f.write(res.content)
                logs.append(f"[{time.strftime('%H:%M:%S')}] [DOWNLOAD] Fallback download completed.")
        else:
            # Check if file already exists (uploaded file saved locally in offline development)
            if storage_path and os.path.exists(os.path.join(ROOT_DIR, "ignore", os.path.basename(storage_path))):
                local_uploaded_path = os.path.join(ROOT_DIR, "ignore", os.path.basename(storage_path))
                import shutil
                shutil.copy(local_uploaded_path, temp_pdf_path)
                logs.append(f"[{time.strftime('%H:%M:%S')}] [INIT] Local uploaded file found at {local_uploaded_path}. Copying to temp workspace.")
            else:
                logs.append(f"[{time.strftime('%H:%M:%S')}] [INIT] Offline development mode: synthesizing mock educational resource contents.")
                update_job_status(job_id, "processing", "fetch", 20, logs, 0, 0, False, is_local, **metadata)
                time.sleep(1.0)
                with open(temp_pdf_path, "w", encoding="utf-8") as f:
                    f.write("Placeholder textbook data for offline development.\n" * 150)

        logs.append(f"[{time.strftime('%H:%M:%S')}] [DOWNLOAD] ✅ Download/File fetch completed. Triggering Downstream Job 2: OCR/Extract...")
        update_job_status(job_id, "processing", "ocr", 25, logs, 0, 0, False, is_local, **metadata)

        # 2. Trigger Job 2 (OCR/Extract) as a separate process
        try:
            python_path = sys.executable or "python"
            ocr_script = os.path.join(ROOT_DIR, "scripts", "ingestion", "job_ocr.py")
            
            payload["temp_pdf_path"] = temp_pdf_path
            
            # Spawn job_ocr.py asynchronously
            proc = subprocess.Popen(
                [python_path, ocr_script],
                stdin=subprocess.PIPE,
                stdout=sys.stdout,
                stderr=sys.stderr,
                text=True
            )
            # Send payload and close stdin
            proc.stdin.write(JSON_Encoder().encode(payload))
            proc.stdin.close()
            print(f"[JOB 1: FETCH] Successfully triggered Job 2 (OCR) with PID {proc.pid}", flush=True)

        except Exception as trigger_err:
            logs.append(f"[{time.strftime('%H:%M:%S')}] [CRITICAL] Failed to trigger Job 2: {trigger_err}")
            update_job_status(job_id, "failed", "fetch", 25, logs, 0, 0, False, is_local, **metadata)
            sys.exit(1)

    except Exception as exc:
        t_str = time.strftime("%H:%M:%S")
        logs.append(f"[{t_str}] [CRITICAL] Fetch Ingestion Crash: {exc}")
        update_job_status(job_id, "failed", "fetch", 25, logs, 0, 0, False, is_local, **metadata)
        sys.exit(1)

class JSON_Encoder(json.JSONEncoder):
    def default(self, obj):
        return super(JSON_Encoder, self).default(obj)

if __name__ == "__main__":
    main()
