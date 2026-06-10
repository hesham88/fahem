import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "ingestion_v2"))

from ingestion_v2.utils import (
    is_mongodb_enabled, get_mongodb_uri, get_active_db, LOCAL_DB_PATH
)

def print_jobs():
    jobs = []
    
    # 1. Try local JSON first
    if os.path.exists(LOCAL_DB_PATH):
        try:
            with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                db = json.load(f)
            jobs_local = db.get("ingestion_jobs", [])
            for j in jobs_local:
                j["_source_db"] = "local_db.json"
                jobs.append(j)
        except Exception as e:
            print(f"[Local DB Error] {e}")

    # 2. Try MongoDB
    if is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri(), serverSelectionTimeoutMS=5000)
            db = get_active_db(client)
            jobs_mongo = list(db["ingestion_jobs"].find())
            for j in jobs_mongo:
                j["_source_db"] = "MongoDB"
                jobs.append(j)
            client.close()
        except Exception as e:
            print(f"[Mongo DB Error] {e}")

    if not jobs:
        print("No ingestion jobs found.")
        return

    print(f"Found {len(jobs)} total jobs:")
    for j in jobs:
        print(f"\n==================================================")
        print(f"JOB ID:      {j.get('_id')}")
        print(f"Source DB:   {j.get('_source_db')}")
        print(f"Title:       {j.get('title')} / {j.get('title_ar')}")
        print(f"Status:      {j.get('status')}")
        print(f"Stage:       {j.get('stage')}")
        print(f"Progress:    {j.get('progress')}%")
        print(f"Pages:       {j.get('processed_pages')} / {j.get('total_pages')}")
        print(f"Language:    {j.get('language')}")
        print(f"User ID:     {j.get('userId')}")
        print(f"Metadata:    { {k: v for k, v in j.items() if k not in ['_id', 'status', 'stage', 'progress', 'processed_pages', 'total_pages', 'language', 'userId', 'logs', '_source_db']} }")
        print(f"------------------ TRACE LOGS ------------------")
        for log in j.get("logs", [])[-15:]:
            print(f"  {log}")

if __name__ == "__main__":
    print_jobs()
