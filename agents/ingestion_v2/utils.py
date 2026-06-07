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

EMBED_MODEL = os.environ.get("EMBED_MODEL", "gemini-embedding-2")
EMBED_DIM = int(os.environ.get("EMBED_DIM", "3072"))


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

def get_active_db(client):
    try:
        parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if parent_dir not in sys.path:
            sys.path.append(parent_dir)
        from mongodb_engine import db_target_var
        return client[db_target_var.get()]
    except Exception:
        return client['fahem']

_MONGO_DISABLED = None

def is_mongodb_enabled():
    global _MONGO_DISABLED
    if _MONGO_DISABLED is not None:
        return not _MONGO_DISABLED
    
    is_cloud_run = bool(os.environ.get("K_SERVICE"))
    if is_cloud_run or os.environ.get("FORCE_MONGO") == "true":
        # In Cloud Run, MongoDB is mandatory. We should never fall back to local JSON database.
        _MONGO_DISABLED = False
        return True

    uri = get_mongodb_uri()
    if "-pri" in uri.lower() and not is_cloud_run and os.environ.get("FORCE_MONGO") != "true" and os.environ.get("DISABLE_MONGO_BYPASS") != "true":
        print("[MongoDB Offline Check] Private MongoDB Atlas URI detected locally. Bypassing MongoDB connection attempt.", file=sys.stderr)
        _MONGO_DISABLED = True
        return False

    try:
        from pymongo import MongoClient
        client = MongoClient(uri, serverSelectionTimeoutMS=2000)
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
    last_exception = None
    for attempt in range(max_retries):
        try:
            result = func(*args, **kwargs)
            if result is not None:
                return result
            raise ValueError(f"Function {func.__name__} returned None")
        except Exception as e:
            last_exception = e
            print(f"[RETRY] Error in {func.__name__} (attempt {attempt+1}/{max_retries}): {e}", file=sys.stderr)
            if attempt == max_retries - 1:
                raise e
        
        sleep_time = delay + random.uniform(0.5, 1.5)
        print(f"[RETRY] Sleeping for {sleep_time:.2f} seconds before retry...", file=sys.stderr)
        time.sleep(sleep_time)
        delay *= 2.0
    
    if last_exception:
        raise last_exception
    return None

def get_gemini_embedding_v2(text, api_key):
    """
    Fetches embeddings using the official google-genai SDK.
    """
    try:
        from google import genai
        if api_key:
            client = genai.Client(api_key=api_key)
        else:
            client = genai.Client()

        resp = client.models.embed_content(
            model=EMBED_MODEL,
            contents=text,
        )
        if resp and resp.embeddings:
            return resp.embeddings[0].values
        raise RuntimeError("Empty response from Gemini embedding API")
    except Exception as e:
        print(f"[Embedding Error] {e}", file=sys.stderr)
        raise RuntimeError(f"Gemini embedding API call failed: {e}")



def generate_gemini_image(prompt, api_key, output_path):
    """
    Generates an image using gemini-3.1-flash-image (or falls back to Pillow layout).
    """
    if not api_key:
        print("[IMAGE AGENT] No API key found. Falling back to premium Pillow layout.", flush=True)
        return False

    try:
        # Use v1beta generateContent endpoint for multimodal image generation models
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key={api_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseModalities": ["IMAGE"]
            }
        }
        res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=45)
        if res.status_code == 200:
            import base64
            res_json = res.json()
            candidates = res_json.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                for part in parts:
                    inline_data = part.get("inlineData")
                    if inline_data:
                        img_b64 = inline_data.get("data")
                        if img_b64:
                            with open(output_path, "wb") as f:
                                f.write(base64.b64decode(img_b64))
                            print(f"[IMAGE AGENT] Successfully generated cover using gemini-3.1-flash-image and saved to {output_path}", flush=True)
                            return True
            print(f"[IMAGE AGENT] Response JSON structure did not match expected inlineData: {res_json}", file=sys.stderr)
        else:
            print(f"[IMAGE AGENT] gemini-3.1-flash-image API returned HTTP {res.status_code}: {res.text}", file=sys.stderr)
    except Exception as e:
        print(f"[IMAGE AGENT] API call failed: {e}. Falling back to premium Pillow layout.", flush=True)
    return False

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
            client = MongoClient(get_mongodb_uri(), serverSelectionTimeoutMS=10000)
            db = get_active_db(client)
            job = db["ingestion_jobs"].find_one({"_id": job_id})
            client.close()
            if job:
                return job.get("status", "queued")
        except Exception as mongo_err:
            print(f"[Mongo Error] Failed to get job status: {mongo_err}", file=sys.stderr)
            pass
        return "queued"
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
                        
                        # Real-time progress update for the book in local JSON
                        book_id = job_id[4:] if job_id.startswith("job_") else None
                        if book_id and "books" in db:
                            for idx, b in enumerate(db["books"]):
                                if b.get("_id") == book_id:
                                    db["books"][idx]["ingestion_status"] = status
                                    db["books"][idx]["ingestion_logs"] = logs
                                    if progress is not None:
                                        db["books"][idx]["ingestion_progress"] = progress
                                    db["books"][idx]["updated_at"] = time.time()
                                    break
                                    
                        atomic_write_json(LOCAL_DB_PATH, db)
                        break
            except Exception:
                time.sleep(0.05 + random.uniform(0.05, 0.1))
    
    if is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri(), serverSelectionTimeoutMS=10000)
            db = get_active_db(client)
            
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
            
            # Real-time progress update for the book in MongoDB
            book_id = job_id[4:] if job_id.startswith("job_") else None
            if book_id:
                set_book_fields = {
                    "ingestion_status": status,
                    "ingestion_logs": logs,
                    "updated_at": time.time()
                }
                if progress is not None:
                    set_book_fields["ingestion_progress"] = progress
                db["books"].update_one(
                    {"_id": book_id},
                    {"$set": set_book_fields}
                )
            client.close()
        except Exception as mongo_err:
            print(f"[Mongo Error] Failed to update job status db only: {mongo_err}", file=sys.stderr)
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
                        
                    # Real-time progress update for the book in local JSON
                    book_id = kwargs.get("book_id")
                    if not book_id and job_id.startswith("job_"):
                        book_id = job_id[4:]
                    if book_id and "books" in db:
                        for idx, b in enumerate(db["books"]):
                            if b.get("_id") == book_id:
                                db["books"][idx]["ingestion_status"] = "completed" if (status == "completed" or is_completed) else status
                                if progress is not None:
                                    db["books"][idx]["ingestion_progress"] = progress
                                db["books"][idx]["ingestion_logs"] = logs
                                db["books"][idx]["processed_pages"] = processed_pages
                                db["books"][idx]["total_pages"] = total_pages
                                db["books"][idx]["updated_at"] = time.time()
                                break
                        
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
            client = MongoClient(get_mongodb_uri(), serverSelectionTimeoutMS=10000)
            db = get_active_db(client)
            
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
            
            # Real-time progress update for the book in MongoDB
            book_id = kwargs.get("book_id")
            if not book_id and job_id.startswith("job_"):
                book_id = job_id[4:]
            if book_id:
                set_book_fields = {
                    "ingestion_status": "completed" if (status == "completed" or is_completed) else status,
                    "ingestion_logs": logs,
                    "processed_pages": processed_pages,
                    "total_pages": total_pages,
                    "updated_at": time.time()
                }
                if progress is not None:
                    set_book_fields["ingestion_progress"] = progress
                db["books"].update_one(
                    {"_id": book_id},
                    {"$set": set_book_fields}
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

def make_progress_bar(percent, width=20):
    """
    Renders a beautiful ASCII progress bar.
    Example: [████████░░░░░░░░░░░░] 40.0%
    """
    try:
        pct = float(percent)
    except Exception:
        pct = 0.0
    pct = max(0.0, min(100.0, pct))
    completed = int(round(pct / 100.0 * width))
    bar = "█" * completed + "░" * (width - completed)
    return f"[{bar}] {pct:.1f}%"

