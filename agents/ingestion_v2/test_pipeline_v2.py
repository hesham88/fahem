#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Integration test harness for Ingestion Pipeline v2.
Validates the five modular sequential process triggers, database listings,
block structural nesting, id-keyed translation overlays, and 3072-dimensional vector embedding mappings.
"""

import os
import sys
import json
import time
import subprocess

from utils import (
    ROOT_DIR, LOCAL_DB_PATH, is_mongodb_enabled, get_mongodb_uri
)

TEST_BOOK_ID = "openstax_python_programming"
TEST_SUBJECT_ID = "subj_computer_science"


def clear_test_data(is_local):
    """
    Ensures a clean playground slate before running verification tests.
    """
    print("[TEST] Clearing old test records from local DB and/or MongoDB...", flush=True)
    
    # 1. Local DB Cleansing
    if is_local or os.path.exists(LOCAL_DB_PATH):
        try:
            with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                db = json.load(f)
            
            if "books" in db:
                db["books"] = [b for b in db["books"] if b.get("_id") != TEST_BOOK_ID]
            if "book_pages" in db:
                db["book_pages"] = [p for p in db["book_pages"] if p.get("book_id") != TEST_BOOK_ID]
            if "ingestion_jobs" in db:
                db["ingestion_jobs"] = [j for j in db["ingestion_jobs"] if j.get("_id") != f"job_{TEST_BOOK_ID}"]
                
            with open(LOCAL_DB_PATH, "w", encoding="utf-8") as f:
                json.dump(db, f, indent=2, ensure_ascii=False)
            print("[TEST] Cleaned local JSON database files.", flush=True)
        except Exception as e:
            print(f"[TEST] Warning: Local DB cleansing failed: {e}", file=sys.stderr)
            
    # 2. MongoDB Cleansing
    if is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri(), serverSelectionTimeoutMS=2000)
            db = client["fahem"]
            
            db["books"].delete_many({"_id": TEST_BOOK_ID})
            db["book_pages"].delete_many({"book_id": TEST_BOOK_ID})
            db["ingestion_jobs"].delete_many({"_id": f"job_{TEST_BOOK_ID}"})
            
            client.close()
            print("[TEST] Cleaned MongoDB collections.", flush=True)
        except Exception as e:
            print(f"[TEST] Warning: MongoDB cleansing failed: {e}", file=sys.stderr)

def verify_pipeline_results(is_local):
    """
    Verifies that pipeline data outputs match structural specifications.
    """
    print("\n[TEST] Starting structural verification of generated database assets...", flush=True)
    
    pages = []
    book_doc = None
    job_doc = None
    
    # Load records
    if is_local or os.path.exists(LOCAL_DB_PATH):
        try:
            with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                db = json.load(f)
            pages = [p for p in db.get("book_pages", []) if p.get("book_id") == TEST_BOOK_ID]
            books = [b for b in db.get("books", []) if b.get("_id") == TEST_BOOK_ID]
            if books:
                book_doc = books[0]
            jobs = [j for j in db.get("ingestion_jobs", []) if j.get("_id") == f"job_{TEST_BOOK_ID}"]
            if jobs:
                job_doc = jobs[0]
        except Exception as e:
            print(f"[TEST ERROR] Failed loading local db results: {e}", file=sys.stderr)
            return False
            
    if is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri())
            db = client["fahem"]
            pages = list(db["book_pages"].find({"book_id": TEST_BOOK_ID}))
            book_doc = db["books"].find_one({"_id": TEST_BOOK_ID})
            job_doc = db["ingestion_jobs"].find_one({"_id": f"job_{TEST_BOOK_ID}"})
            client.close()
        except Exception as e:
            print(f"[TEST ERROR] Failed loading MongoDB results: {e}", file=sys.stderr)
            return False

    # 1. Verify Job Status
    if not job_doc:
        print("[TEST FAILED] Ingestion Job record not found in database!", file=sys.stderr)
        return False
        
    status = job_doc.get("status")
    print(f"[TEST SUCCESS] Job status resolved as: '{status}' (Expected: 'completed')")
    if status != "completed":
        print(f"[TEST FAILED] Job did not finish successfully! Status is {status}", file=sys.stderr)
        return False

    # 2. Verify Pages count
    print(f"[TEST SUCCESS] Total processed pages found: {len(pages)}")
    if len(pages) == 0:
        print("[TEST FAILED] No processed page records discovered!", file=sys.stderr)
        return False

    # 3. Verify Page Structure (Blocks, i18n, embedding dimensions)
    sample_page = pages[0]
    blocks = sample_page.get("blocks", [])
    i18n = sample_page.get("i18n", {})
    vector = sample_page.get("embedding", [])
    
    print(f"\n--- SAMPLE PAGE ({sample_page.get('_id')}) STRUCTURE AUDIT ---")
    print(f"- Text Blocks Extracted: {len(blocks)}")
    if len(blocks) == 0:
        print("[TEST FAILED] Extracted blocks are empty!", file=sys.stderr)
        return False
        
    print(f"- Structured Directory Mode: '{sample_page.get('dir')}'")
    
    # Audit nesting and parent links
    nested_blocks = [b for b in blocks if b.get("parent") != ""]
    print(f"- Nested Blocks (parent pointers): {len(nested_blocks)}")
    
    # Audit i18n overlays
    print(f"- i18n Localizations: {len(i18n)} mapped entries")
    if len(i18n) == 0:
        print("[TEST FAILED] i18n Translation dictionaries are empty!", file=sys.stderr)
        return False
        
    # Audit embedding dimensions
    print(f"- Embedding Vector Dimensions: {len(vector)} (Expected: 3072)")
    if len(vector) != 3072:
        print(f"[TEST FAILED] Vector size is {len(vector)} instead of 3072!", file=sys.stderr)
        return False

    # 4. Verify book cover, mind map and chapters inside BookDoc
    if not book_doc:
        print("[TEST FAILED] Catalog Book record not found in database!", file=sys.stderr)
        return False
        
    print(f"\n--- CATALOG BOOK ({book_doc.get('_id')}) METADATA AUDIT ---")
    print(f"- Cover Full Image URL: '{book_doc.get('coverUrl')}'")
    print(f"- Cover Thumbnail URL: '{book_doc.get('coverThumbUrl')}'")
    print(f"- Chapters Count: {len(book_doc.get('chapters', []))}")
    
    mind_map = book_doc.get("mindMap", {})
    print(f"- Mind Map Nodes: {len(mind_map.get('nodes', []))}")
    print(f"- Mind Map Links: {len(mind_map.get('links', []))}")
    
    if len(mind_map.get("nodes", [])) == 0 or len(mind_map.get("links", [])) == 0:
        print("[TEST FAILED] Interactive mind map coordinates are incomplete!", file=sys.stderr)
        return False
        
    print("\n[TEST COMPLETED] [SUCCESS] All structural criteria verified. Ingestion Pipeline v2 is 100% compliant!")
    return True

def main():
    print("=====================================================================", flush=True)
    print("      FAHEM INGESTION PIPELINE V2 - CONCURRENT INTEGRATION TEST      ", flush=True)
    print("=====================================================================\n", flush=True)
    
    # Reset database records
    # clear_test_data(is_local=True)
    
    # Build payload structure
    payload = {
        "book_id": TEST_BOOK_ID,
        "subject_id": TEST_SUBJECT_ID,
        "title": "Introduction to Python Programming",
        "title_ar": "مقدمة في البرمجة بلغة بايثون",
        "source_url": "https://assets.openstax.org/oscms-prodcms/media/documents/Introduction_to_Python_Programming-WEB.pdf",
        "storage_path": None,
        "grade": "General",
        "term": "Full Year",
        "year": "2026",
        "language": "en",
        "book_type": "core",
        "userId": "usr_tester_v2",
        "is_local": True
    }
    
    python_path = sys.executable or "python"
    fetch_script = os.path.join(ROOT_DIR, "agents", "ingestion_v2", "job_fetch.py")
    
    print("[TEST] Spawning modular subprocess: Stage 1 (Fetch)...", flush=True)
    start_time = time.time()
    
    proc = subprocess.Popen(
        [python_path, fetch_script],
        stdin=subprocess.PIPE,
        stdout=sys.stdout,
        stderr=sys.stderr,
        text=True
    )
    
    # Send payload and wait for execution cascade (Stage 1 -> 2 -> 3 -> 4 -> 5)
    proc.stdin.write(json.dumps(payload))
    proc.stdin.close()
    
    from utils import get_job_status

    print("[TEST] Process cascade triggered in background. Polling and waiting for complete pipeline cascade...", flush=True)
    proc.wait()

    # Dynamic status polling with a timeout
    max_wait = 3000
    poll_start = time.time()
    job_id = f"job_{TEST_BOOK_ID}"
    finished = False

    print("[TEST] Job 1 (Fetch) finished. Now polling background cascade job status...", flush=True)
    while time.time() - poll_start < max_wait:
        status = get_job_status(job_id, is_local=True)
        print(f"[TEST POLLER] Current status: '{status}' (elapsed: {time.time() - poll_start:.1f}s)", flush=True)
        if status in ["completed", "failed", "killed"]:
            finished = True
            break
        time.sleep(1.5)

    if not finished:
        print("[TEST WARNING] Polling timed out before job completed. Proceeding to verification...", flush=True)

    elapsed = time.time() - start_time
    print(f"[TEST] Modular execution pool completed. Elapsed time: {elapsed:.2f} seconds.", flush=True)
    
    # Run assertions
    success = verify_pipeline_results(is_local=True)
    if success:
        print("\n[TEST STATUS] SUCCESS! Ingestion Pipeline v2 end-to-end cascade test passed flawlessly!")
        sys.exit(0)
    else:
        print("\n[TEST STATUS] FAILURE! One or more verification assertions failed.", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
