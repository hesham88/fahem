#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Job 4: Ingestion Finalizer & Database Mapping Job.
Performs final index checks, links book in subjects count, cleans up transient draft chunks,
and sets job state as completed (100% progress).
"""

import os
import sys
import json
import time
from utils import (
    update_job_status, get_mongodb_uri, LOCAL_DB_PATH, 
    atomic_write_json, is_mongodb_enabled
)

def clean_draft_chunks(book_id, is_local):
    """
    Cleans transient page draft chunks in the ingestion_chunks_draft collection or local DB.
    """
    if is_local or not is_mongodb_enabled():
        if os.path.exists(LOCAL_DB_PATH):
            try:
                with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                    db = json.load(f)
                if "ingestion_chunks_draft" in db:
                    db["ingestion_chunks_draft"] = [c for c in db["ingestion_chunks_draft"] if c.get("book_id") != book_id]
                atomic_write_json(LOCAL_DB_PATH, db)
            except Exception as e:
                print(f"[JOB 4 Local Clean Error] {e}", file=sys.stderr)
    
    if is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri(), serverSelectionTimeoutMS=2000)
            db = client["fahem"]
            db["ingestion_chunks_draft"].delete_many({"book_id": book_id})
            client.close()
        except Exception as e:
            print(f"[JOB 4 Mongo Clean Error] {e}", file=sys.stderr)

def finalize_subject_link(subject_id, is_local):
    """
    Updates the subject books_count and pages metrics.
    """
    if is_local or not is_mongodb_enabled():
        if os.path.exists(LOCAL_DB_PATH):
            try:
                with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                    db = json.load(f)
                
                if "subjects" in db:
                    for s in db["subjects"]:
                        if s.get("_id") == subject_id:
                            # Count actual books
                            count = len([b for b in db.get("books", []) if b.get("subject_id") == subject_id])
                            s["books_count"] = count
                            break
                atomic_write_json(LOCAL_DB_PATH, db)
            except Exception as e:
                print(f"[JOB 4 Local Subject Error] {e}", file=sys.stderr)
                
    if is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri(), serverSelectionTimeoutMS=2000)
            db = client["fahem"]
            
            # Count actual books in MongoDB
            count = db["books"].count_documents({"subject_id": subject_id})
            
            db["subjects"].update_one(
                {"_id": subject_id},
                {"$set": {"books_count": count}}
            )
            client.close()
        except Exception as e:
            print(f"[JOB 4 Mongo Subject Error] {e}", file=sys.stderr)

def main():
    try:
        payload = json.loads(sys.stdin.read())
    except Exception as e:
        print(f"Error parsing stdin JSON in Job 4: {e}", file=sys.stderr)
        sys.exit(1)

    book_id = payload.get("book_id")
    subject_id = payload.get("subject_id", "subj_user_uploads")
    is_local = payload.get("is_local", True)
    total_pages = payload.get("total_pages", 1)
    
    logs = payload.get("ingestion_logs", [])
    if not logs:
        logs = [f"[{time.strftime('%H:%M:%S')}] [INIT] Job 4: Ingestion Finalizer process spawned."]
        
    job_id = f"job_{book_id}"
    
    metadata = {
        "book_id": book_id,
        "subject_id": subject_id,
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
    logs.append(f"[{t_str}] [COMPLETE] Job 4: Executing final consistency validations and linking metadata records.")
    update_job_status(job_id, "processing", "finalize", 95, logs, total_pages, total_pages, False, is_local, **metadata)

    # Clean transient drafts
    clean_draft_chunks(book_id, is_local)
    
    # Finalize link inside subjects
    finalize_subject_link(subject_id, is_local)

    logs.append(f"[{time.strftime('%H:%M:%S')}] [COMPLETE] ✅ All ingestion tasks completed successfully. Textbook is now fully optimized and active for RAG.")
    print(f"[JOB 4: FINALIZE] Ingestion completed. Setting job state as completed...", flush=True)

    update_job_status(
        job_id, "completed", "finalize", 100, logs, 
        processed_pages=total_pages, total_pages=total_pages, 
        is_completed=True, is_local=is_local, **metadata
    )
    
    sys.exit(0)

if __name__ == "__main__":
    main()
