#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Shared utilities for Fahem Ingestion Pipeline v2.
Handles MongoDB, local JSON fallback, Gemini API calls, retries, and cooperative pause/kill.
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
# ROOT_DIR points to fahem project root C:\Users\hesh1\Desktop\fahem
ROOT_DIR = os.path.dirname(os.path.dirname(SCRIPT_DIR))

LOCAL_DB_PATH = os.path.join(ROOT_DIR, "web", "src", "app", "api", "local_db.json")
if not os.path.exists(LOCAL_DB_PATH):
    LOCAL_DB_PATH = os.path.join(ROOT_DIR, "src", "app", "api", "local_db.json")

class JSON_Encoder(json.JSONEncoder):
    def default(self, obj):
        return super(JSON_Encoder, self).default(obj)

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
    if "-pri" in uri.lower() and not os.environ.get("K_SERVICE") and os.environ.get("FORCE_MONGO") != "true" and os.environ.get("DISABLE_MONGO_BYPASS") != "true":
        print("[MongoDB Offline Check] Private MongoDB Atlas URI detected locally. Bypassing MongoDB connection attempt.", file=sys.stderr)
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

def get_gemini_config():
    """
    Retrieves Gemini key and model from environment or ignore/gemini_secrets.json.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    model = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite")
    try:
        secrets_path = os.path.join(ROOT_DIR, "ignore", "gemini_secrets.json")
        if os.path.exists(secrets_path):
            with open(secrets_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if not api_key:
                    api_key = data.get("GEMINI_API_KEY")
                if not os.environ.get("GEMINI_MODEL"):
                    model = data.get("GEMINI_MODEL", "gemini-3.1-flash-lite")
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
        
        sleep_time = delay + random.uniform(0.5, 1.5)
        print(f"[RETRY] Sleeping for {sleep_time:.2f} seconds before retry...", file=sys.stderr)
        time.sleep(sleep_time)
        delay *= 2.0
    return None

def get_gemini_embedding_v2(text, api_key):
    """
    Fetches 3072-dimensional embeddings using gemini-embedding-2.
    """
    if not api_key:
        return get_fallback_embedding(text)
    try:
        # Use gemini-embedding-2 endpoint
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key={api_key}"
        payload = {
            "model": "models/gemini-embedding-2",
            "content": {
                "parts": [{"text": text}]
            }
        }
        res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
        if res.status_code == 200:
            return res.json()["embedding"]["values"]
        else:
            print(f"[Embedding API Error] HTTP {res.status_code}: {res.text}", file=sys.stderr)
    except Exception as e:
        print(f"[Embedding Error] {e}. Falling back to deterministic SHA256 embedding.", file=sys.stderr)
    return get_fallback_embedding(text)

def get_fallback_embedding(text, dimensions=3072):
    """
    Generates deterministic pseudo-embedding vector of 'dimensions' size.
    """
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()
    seed = int(h[:8], 16)
    r = random.Random(seed)
    return [r.uniform(-0.15, 0.15) for _ in range(dimensions)]

def atomic_write_json(file_path, data):
    dir_name = os.path.dirname(file_path)
    os.makedirs(dir_name, exist_ok=True)
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
                        job_entry = db["ingestion_jobs"][job_idx]
                    else:
                        job_entry = {"_id": job_id, "created_at": time.time()}
                        db["ingestion_jobs"].append(job_entry)
                        job_idx = len(db["ingestion_jobs"]) - 1
                        
                    job_entry["status"] = status
                    job_entry["current_step"] = current_step
                    job_entry["progress"] = progress
                    job_entry["logs"] = logs
                    job_entry["processed_pages"] = processed_pages
                    job_entry["total_pages"] = total_pages
                    job_entry["updated_at"] = time.time()
                    
                    for k, v in kwargs.items():
                        job_entry[k] = v
                        
                    # If there's a new page doc, append/update in book_pages collection
                    if new_page_doc:
                        if "book_pages" not in db:
                            db["book_pages"] = []
                        page_id = new_page_doc.get("_id")
                        existing_idx = -1
                        for idx, p in enumerate(db["book_pages"]):
                            if p.get("_id") == page_id:
                                existing_idx = idx
                                break
                        if existing_idx >= 0:
                            db["book_pages"][existing_idx] = new_page_doc
                        else:
                            db["book_pages"].append(new_page_doc)
                            
                    # If the pipeline has completed, upsert the unified book metadata
                    if is_completed:
                        if "books" not in db:
                            db["books"] = []
                        b_id = kwargs.get("book_id")
                        if b_id:
                            book_entry = {
                                "_id": b_id,
                                "subject_id": kwargs.get("subject_id"),
                                "title": kwargs.get("title"),
                                "title_ar": kwargs.get("title_ar"),
                                "source_url": kwargs.get("source_url"),
                                "storage_path": kwargs.get("storage_path"),
                                "grade": kwargs.get("grade"),
                                "term": kwargs.get("term"),
                                "year": kwargs.get("year"),
                                "language": kwargs.get("language"),
                                "book_type": kwargs.get("book_type"),
                                "userId": kwargs.get("userId"),
                                "chapters": kwargs.get("chapters", []),
                                "coverUrl": kwargs.get("coverUrl"),
                                "coverThumbUrl": kwargs.get("coverThumbUrl"),
                                "mindMap": kwargs.get("mindMap", {"nodes": [], "links": []}),
                                "status": "structured",
                                "updated_at": time.time()
                            }
                            existing_bk_idx = -1
                            for idx, b in enumerate(db["books"]):
                                if b.get("_id") == b_id:
                                    existing_bk_idx = idx
                                    break
                            if existing_bk_idx >= 0:
                                db["books"][existing_bk_idx] = book_entry
                            else:
                                db["books"].append(book_entry)
                            
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
                "current_step": current_step,
                "progress": progress,
                "logs": logs,
                "processed_pages": processed_pages,
                "total_pages": total_pages,
                "updated_at": time.time()
            }
            for k, v in kwargs.items():
                set_fields[k] = v
                
            db["ingestion_jobs"].update_one(
                {"_id": job_id},
                {"$set": set_fields},
                upsert=True
            )
            
            if new_page_doc:
                db["book_pages"].update_one(
                    {"_id": new_page_doc["_id"]},
                    {"$set": new_page_doc},
                    upsert=True
                )
                
            if is_completed:
                b_id = kwargs.get("book_id")
                if b_id:
                    book_entry = {
                        "_id": b_id,
                        "subject_id": kwargs.get("subject_id"),
                        "title": kwargs.get("title"),
                        "title_ar": kwargs.get("title_ar"),
                        "source_url": kwargs.get("source_url"),
                        "storage_path": kwargs.get("storage_path"),
                        "grade": kwargs.get("grade"),
                        "term": kwargs.get("term"),
                        "year": kwargs.get("year"),
                        "language": kwargs.get("language"),
                        "book_type": kwargs.get("book_type"),
                        "userId": kwargs.get("userId"),
                        "chapters": kwargs.get("chapters", []),
                        "coverUrl": kwargs.get("coverUrl"),
                        "coverThumbUrl": kwargs.get("coverThumbUrl"),
                        "mindMap": kwargs.get("mindMap", {"nodes": [], "links": []}),
                        "status": "structured",
                        "updated_at": time.time()
                    }
                    db["books"].update_one(
                        {"_id": b_id},
                        {"$set": book_entry},
                        upsert=True
                    )
            client.close()
        except Exception as e:
            print(f"[Mongo Status Update Error] {e}", file=sys.stderr)
