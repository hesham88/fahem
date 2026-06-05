#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Shared utilities for the modular asynchronous ingestion multi-job pipeline.
Handles MongoDB connectivity, local JSON database atomicity, Gemini embeddings,
and cooperative pause/resume/kill state-tracking controls.
"""

import os
import sys
import json
import time
import random
import tempfile
import hashlib
import requests

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(os.path.dirname(SCRIPT_DIR))
LOCAL_DB_PATH = os.path.join(ROOT_DIR, "web", "src", "app", "api", "local_db.json")
if not os.path.exists(LOCAL_DB_PATH):
    LOCAL_DB_PATH = os.path.join(ROOT_DIR, "src", "app", "api", "local_db.json")

def get_mongodb_uri():
    uri = os.environ.get("MONGODB_URI")
    if uri:
        return uri
    try:
        secrets_path = os.path.join(ROOT_DIR, "ignore", "mongodb_secrets.json")
        if os.path.exists(secrets_path):
            with open(secrets_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                val = data.get("MONGODB_URI")
                if val:
                    return val
    except Exception:
        pass
    return "mongodb://localhost:27017"

_MONGO_DISABLED = None

def is_mongodb_enabled():
    global _MONGO_DISABLED
    if _MONGO_DISABLED is not None:
        return not _MONGO_DISABLED
    
    uri = get_mongodb_uri()
    if "-pri" in uri.lower() and not os.environ.get("K_SERVICE"):
        print("[MongoDB Offline Check] Private MongoDB Atlas URI detected locally. Bypassing MongoDB connection attempt to avoid DNS/timeout hangs.", file=sys.stderr)
        _MONGO_DISABLED = True
        return False

    try:
        from pymongo import MongoClient
        client = MongoClient(uri, serverSelectionTimeoutMS=1000)
        client.server_info()
        client.close()
        _MONGO_DISABLED = False
    except Exception as e:
        print(f"[MongoDB Offline Check] MongoDB connection failed ({e}). Disabling MongoDB writes and relying on local JSON database.", file=sys.stderr)
        _MONGO_DISABLED = True
        
    return not _MONGO_DISABLED

def get_gemini_embedding(text, api_key):
    if not api_key:
        return get_fallback_embedding(text)
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
        payload = {
            "model": "models/text-embedding-004",
            "content": {
                "parts": [{"text": text}]
            }
        }
        res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
        if res.status_code == 200:
            return res.json()["embedding"]["values"]
    except Exception as e:
        print(f"[Embedding Error] {e}. Falling back to SHA256 embedding.", file=sys.stderr)
    return get_fallback_embedding(text)

def get_fallback_embedding(text):
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()
    seed = int(h[:8], 16)
    r = random.Random(seed)
    return [r.uniform(-0.15, 0.15) for _ in range(768)]

def atomic_write_json(file_path, data):
    dir_name = os.path.dirname(file_path)
    with tempfile.NamedTemporaryFile('w', dir=dir_name, delete=False, encoding='utf-8') as tf:
        json.dump(data, tf, indent=2, ensure_ascii=False)
        temp_name = tf.name
    try:
        os.replace(temp_name, file_path)
    except Exception as e:
        if os.path.exists(temp_name):
            try:
                os.remove(temp_name)
            except Exception:
                pass
        raise e

def get_job_status(job_id, is_local):
    """
    Query the current status of the job from local_db or MongoDB.
    """
    if is_local or not is_mongodb_enabled():
        if os.path.exists(LOCAL_DB_PATH):
            try:
                with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                    db = json.load(f)
                jobs = db.get("ingestion_jobs", [])
                for j in jobs:
                    if j.get("_id") == job_id:
                        return j.get("status", "queued")
            except Exception:
                pass
        if not is_local:
            return "queued"
    else:
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri(), serverSelectionTimeoutMS=1500)
            db = client["fahem"]
            job = db["ingestion_jobs"].find_one({"_id": job_id})
            client.close()
            if job:
                return job.get("status", "queued")
        except Exception:
            pass
    return "queued"

def check_cooperative_control(job_id, is_local, logs):
    """
    Yields or blocks if job is paused, exits if killed/failed.
    """
    status = get_job_status(job_id, is_local)
    
    if status == "killed" or status == "failed":
        print(f"[COOPERATIVE CONTROL] Job {job_id} terminated/killed manually.", flush=True)
        sys.exit(0)
        
    if status == "paused":
        print(f"[COOPERATIVE CONTROL] Job {job_id} paused. Entering sleep wait state...", flush=True)
        t_str = time.strftime("%H:%M:%S")
        logs.append(f"[{t_str}] [SYSTEM] ⏸️ Job execution cooperative pause requested. Holding process execution.")
        update_job_status_db_only(job_id, "paused", None, None, logs, is_local)
        
        while True:
            time.sleep(1.5)
            status = get_job_status(job_id, is_local)
            if status == "killed" or status == "failed":
                print(f"[COOPERATIVE CONTROL] Job {job_id} killed/aborted during pause.", flush=True)
                sys.exit(0)
            if status != "paused":
                # Resumed!
                print(f"[COOPERATIVE CONTROL] Job {job_id} resumed.", flush=True)
                t_str_res = time.strftime("%H:%M:%S")
                logs.append(f"[{t_str_res}] [SYSTEM] ▶️ Job execution cooperative resume requested. Re-starting processor context.")
                update_job_status_db_only(job_id, "processing", None, None, logs, is_local)
                break

def update_job_status_db_only(job_id, status, current_step, progress, logs, is_local):
    """
    Quick status updates without affecting page progression variables.
    """
    if is_local or not is_mongodb_enabled():
        for attempt in range(5):
            try:
                if os.path.exists(LOCAL_DB_PATH):
                    with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                        db = json.load(f)
                    
                    if "ingestion_jobs" not in db:
                        db["ingestion_jobs"] = []
                    
                    job_idx = -1
                    for idx, j in enumerate(db["ingestion_jobs"]):
                        if j.get("_id") == job_id:
                            job_idx = idx
                            break
                    
                    if job_idx >= 0:
                        db["ingestion_jobs"][job_idx]["status"] = status
                        db["ingestion_jobs"][job_idx]["logs"] = logs
                        if current_step:
                            db["ingestion_jobs"][job_idx]["current_step"] = current_step
                        if progress is not None:
                            db["ingestion_jobs"][job_idx]["progress"] = progress
                        db["ingestion_jobs"][job_idx]["updated_at"] = time.time()
                        atomic_write_json(LOCAL_DB_PATH, db)
                        break
            except Exception:
                time.sleep(0.05 + random.uniform(0.05, 0.1))
    
    if is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri(), serverSelectionTimeoutMS=1500)
            db = client["fahem"]
            
            set_fields = {
                "status": status,
                "logs": logs,
                "updated_at": time.time()
            }
            if current_step:
                set_fields["current_step"] = current_step
            if progress is not None:
                set_fields["progress"] = progress
                
            db["ingestion_jobs"].update_one(
                {"_id": job_id},
                {"$set": set_fields},
                upsert=True
            )
            client.close()
        except Exception:
            pass

def update_job_status(job_id, status, current_step, progress, logs, processed_pages=0, total_pages=0, is_completed=False, is_local=True, new_page_doc=None, **kwargs):
    """
    Safely update job metadata, logs, and pages in both local_db.json and MongoDB.
    """
    # 1. Update local_db.json
    if is_local or not is_mongodb_enabled():
        for attempt in range(5):
            try:
                if os.path.exists(LOCAL_DB_PATH):
                    with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                        db = json.load(f)
                    
                    # Ensure ingestion_jobs structure
                    if "ingestion_jobs" not in db:
                        db["ingestion_jobs"] = []
                    
                    job_idx = -1
                    for idx, j in enumerate(db["ingestion_jobs"]):
                        if j.get("_id") == job_id:
                            job_idx = idx
                            break
                    
                    if job_idx >= 0:
                        job_entry = db["ingestion_jobs"][job_idx]
                    else:
                        job_entry = {"_id": job_id, "created_at": time.time()}
                        db["ingestion_jobs"].append(job_entry)
                        job_idx = len(db["ingestion_jobs"]) - 1
                    
                    # Update job fields
                    job_entry["status"] = status
                    job_entry["current_step"] = current_step
                    job_entry["progress"] = progress
                    job_entry["logs"] = logs
                    job_entry["processed_pages"] = processed_pages
                    job_entry["total_pages"] = total_pages
                    job_entry["is_completed"] = is_completed
                    job_entry["updated_at"] = time.time()
                    job_entry["active_pid"] = os.getpid()
                    
                    # Store metadata if supplied
                    if "metadata" not in job_entry:
                        job_entry["metadata"] = {}
                    for k, v in kwargs.items():
                        if v is not None:
                            job_entry["metadata"][k] = v
                    
                    # Sync to books collection in Local DB if we are finalized or in progress
                    if "books" not in db:
                        db["books"] = []
                        
                    book_id = kwargs.get("book_id") or job_id.replace("job_", "")
                    book_idx = -1
                    for idx, b in enumerate(db["books"]):
                        if b.get("_id") == book_id:
                            book_idx = idx
                            break
                            
                    if book_idx < 0:
                        book_entry = {"_id": book_id, "created_at": time.time()}
                        db["books"].append(book_entry)
                        book_idx = len(db["books"]) - 1
                    else:
                        book_entry = db["books"][book_idx]
                        
                    # Sync common fields so UI remains fully backwards compatible!
                    book_entry["ingestion_status"] = status
                    book_entry["ingestion_progress"] = progress
                    book_entry["ingestion_logs"] = logs
                    book_entry["processed_pages"] = processed_pages
                    book_entry["total_pages"] = total_pages
                    book_entry["is_completed"] = is_completed
                    book_entry["is_processed"] = is_completed
                    book_entry["is_extracted"] = is_completed
                    book_entry["is_indexed"] = is_completed
                    book_entry["is_vectored"] = is_completed
                    book_entry["is_embedded"] = is_completed
                    book_entry["is_analyzed"] = is_completed
                    book_entry["is_downloaded"] = (current_step != "fetch") or is_completed
                    book_entry["last_processed_page"] = processed_pages
                    book_entry["extracted_pages_count"] = processed_pages
                    book_entry["updated_at"] = time.time()
                    
                    for k, v in kwargs.items():
                        if v is not None:
                            book_entry[k] = v
                            
                    if new_page_doc:
                        if "book_pages" not in db:
                            db["book_pages"] = []
                        db["book_pages"] = [p for p in db["book_pages"] if p.get("_id") != new_page_doc["_id"]]
                        db["book_pages"].append(new_page_doc)
                    
                    atomic_write_json(LOCAL_DB_PATH, db)
                    break
            except Exception as e:
                print(f"[RETRY ERROR] Local DB write collision in utilities: {e}", file=sys.stderr)
                time.sleep(0.05 + random.uniform(0.05, 0.1))

    # 2. Update MongoDB
    if is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            uri = get_mongodb_uri()
            client = MongoClient(uri, serverSelectionTimeoutMS=2000)
            db = client["fahem"]
            
            # Update ingestion_jobs
            job_fields = {
                "status": status,
                "current_step": current_step,
                "progress": progress,
                "logs": logs,
                "processed_pages": processed_pages,
                "total_pages": total_pages,
                "is_completed": is_completed,
                "updated_at": time.time(),
                "active_pid": os.getpid()
            }
            
            # Merge metadata
            metadata = {}
            for k, v in kwargs.items():
                if v is not None:
                    metadata[k] = v
            if metadata:
                job_fields["metadata"] = metadata
                
            db["ingestion_jobs"].update_one(
                {"_id": job_id},
                {"$set": job_fields},
                upsert=True
            )
            
            # Sync to books
            book_id = kwargs.get("book_id") or job_id.replace("job_", "")
            book_fields = {
                "ingestion_status": status,
                "ingestion_progress": progress,
                "ingestion_logs": logs,
                "processed_pages": processed_pages,
                "total_pages": total_pages,
                "is_completed": is_completed,
                "is_processed": is_completed,
                "is_extracted": is_completed,
                "is_indexed": is_completed,
                "is_vectored": is_completed,
                "is_embedded": is_completed,
                "is_analyzed": is_completed,
                "is_downloaded": (current_step != "fetch") or is_completed,
                "last_processed_page": processed_pages,
                "extracted_pages_count": processed_pages,
                "updated_at": time.time()
            }
            for k, v in kwargs.items():
                if v is not None:
                    book_fields[k] = v
                    
            db["books"].update_one(
                {"_id": book_id},
                {"$set": book_fields},
                upsert=True
            )
            
            if new_page_doc:
                db["book_pages"].update_one(
                    {"_id": new_page_doc["_id"]},
                    {"$set": new_page_doc},
                    upsert=True
                )
                
            client.close()
        except Exception as e:
            print(f"[Mongo Error] {e}", file=sys.stderr)
            pass
