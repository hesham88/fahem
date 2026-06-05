import json
import os
import sys

# Add scripts directory to path to import utils
sys.path.append(os.path.join(r"C:\Users\hesh1\Desktop\fahem", "scripts"))
from ingestion.utils import get_mongodb_uri, is_mongodb_enabled

print("MongoDB Enabled:", is_mongodb_enabled())
uri = get_mongodb_uri()
print("MongoDB URI exists:", bool(uri))

try:
    from pymongo import MongoClient
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    db = client["fahem"]
    
    # List collections
    print("Collections:", db.list_collection_names())
    
    # Query ingestion jobs
    jobs = list(db["ingestion_jobs"].find({}))
    print(f"Found {len(jobs)} ingestion jobs in MongoDB.")
    for job in jobs:
        if "python" in job.get("_id", "").lower() or "python" in str(job.get("metadata", {}).get("title", "")).lower():
            print(f"\n=================== JOB: {job.get('_id')} ===================")
            print(f"Status: {job.get('status')}")
            print(f"Current Step: {job.get('current_step')}")
            print(f"Progress: {job.get('progress')}%")
            print(f"Processed Pages: {job.get('processed_pages')} / {job.get('total_pages')}")
            print("Logs (last 30):")
            for log in job.get("logs", [])[-30:]:
                print("  ", log)
    client.close()
except Exception as e:
    print("Error querying MongoDB:", e)
