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
    
    # Query crawl jobs
    jobs = list(db["crawl_jobs"].find({}))
    print(f"Found {len(jobs)} crawl jobs in MongoDB.")
    
    # Sort by created_at descending or similar if present
    for job in sorted(jobs, key=lambda j: j.get("created_at", 0), reverse=True)[:5]:
        print(f"\n=================== CRAWL JOB: {job.get('_id')} ===================")
        print(f"URL: {job.get('url')}")
        print(f"Status: {job.get('status')}")
        print(f"Progress: {job.get('progress')}%")
        print(f"Active PID: {job.get('active_pid')}")
        print("Logs:")
        for log in job.get("logs", [])[-15:]:
            print("  ", log)
    client.close()
except Exception as e:
    print("Error querying MongoDB:", e)
