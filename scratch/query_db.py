import os
import sys
import json
import pymongo

# Add agents folder to sys.path
agents_path = r"C:\Users\hesh1\Desktop\fahem\agents"
if agents_path not in sys.path:
    sys.path.append(agents_path)

from tools import get_mongodb_uri

# Resolve the MONGODB_URI
resolved_uri = get_mongodb_uri()
print("Resolved URI:", resolved_uri)

try:
    client = pymongo.MongoClient(resolved_uri, serverSelectionTimeoutMS=5000)
    # Ping
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
    
    db = client["fahem"]
    
    # Query latest books
    print("\n--- LATEST BOOKS ---")
    books = list(db["books"].find().sort("_id", -1).limit(5))
    for b in books:
        print(f"ID: {b.get('_id')}, Title: {b.get('title')}, Status: {b.get('status') or b.get('ingestion_status')}, Needs Approval: {b.get('needs_approval')}")
        if b.get('_id') == "book_psychology_2e_1781059206404":
            print("Psychology 2e doc:", json.dumps(b, default=str, indent=2))
        
    # Query crawl_jobs
    print("\n--- LATEST CRAWL JOBS ---")
    if "crawl_jobs" in db.list_collection_names():
        jobs = list(db["crawl_jobs"].find().sort("created_at", -1).limit(3))
        for j in jobs:
            print(f"ID: {j.get('_id') or j.get('jobId')}, Url: {j.get('url')}, Status: {j.get('status')}, Progress: {j.get('progress')}")
            if j.get('_id') == "crawl_1781059152220_mcy0p":
                print("Latest job doc:", json.dumps(j, default=str, indent=2))
            
    # Query ingestion_jobs
    print("\n--- LATEST INGESTION JOBS ---")
    if "ingestion_jobs" in db.list_collection_names():
        jobs = list(db["ingestion_jobs"].find().sort("created_at", -1).limit(5))
        for j in jobs:
            print(f"ID: {j.get('_id')}, Status: {j.get('status') or j.get('ingestion_status')}")

except Exception as e:
    print("Error connecting/querying:", e)
    import traceback
    traceback.print_exc()
