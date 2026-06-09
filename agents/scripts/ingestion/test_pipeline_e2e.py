#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
E2E manual integration test script for the modular python ingestion pipeline.
"""

import os
import sys
import json
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(os.path.dirname(SCRIPT_DIR))

def main():
    print("=== STARTING MANUAL E2E INGESTION TEST ===")
    
    # Check if local_db.json path is correct
    local_db_path = os.path.join(ROOT_DIR, "web", "src", "app", "api", "local_db.json")
    print(f"Local DB Path: {local_db_path}")
    print(f"Exists: {os.path.exists(local_db_path)}")
    
    # Prepare payload
    payload = {
        "book_id": "test_e2e_book_manual_1",
        "subject_id": "subj_user_uploads",
        "title": "E2E Manual Physics Test",
        "title_ar": "E2E Manual Physics Test Arabic",
        "source_url": "https://openstax.org/instructor-manual/college-physics-2e.pdf",
        "is_local": True,
        "grade": "General",
        "term": "Term 1",
        "year": "2026",
        "language": "ar",
        "book_type": "core"
    }
    
    job_fetch_path = os.path.join(SCRIPT_DIR, "job_fetch.py")
    
    python_path = sys.executable or "python"
    
    print(f"Spawning {job_fetch_path} with payload...")
    proc = subprocess.Popen(
        [python_path, job_fetch_path],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    stdout, stderr = proc.communicate(input=json.dumps(payload))
    
    print("\n--- Child stdout ---")
    print(stdout)
    print("--- Child stderr ---")
    print(stderr)
    print(f"Exit code: {proc.returncode}")
    
    # Check if job registered inside local_db.json
    if os.path.exists(local_db_path):
        with open(local_db_path, "r", encoding="utf-8") as f:
            db = json.load(f)
        jobs = db.get("ingestion_jobs", [])
        for j in jobs:
            if j.get("_id") == "job_test_e2e_book_manual_1":
                print("\n[SUCCESS] Job successfully registered in local_db.json!")
                print(f"Status: {j.get('status')}")
                print(f"Progress: {j.get('progress')}%")
                print(f"Current step: {j.get('current_step')}")
                print(f"Logs count: {len(j.get('logs', []))}")
                return
        print("\n[ERROR] Job NOT found inside local_db.json's ingestion_jobs.")
    else:
        print("\n[ERROR] local_db.json not found!")

if __name__ == "__main__":
    main()
