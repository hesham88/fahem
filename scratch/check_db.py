import os
import sys
import json
import pymongo

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _ROOT)

def main():
    uri = "mongodb+srv://fahem_mcp:RJkyLV67fo6hEqUv@fahemcluster-pri.trf718.mongodb.net/?appName=FahemCluster"
    client = pymongo.MongoClient(uri)
    db = client["fahem"]
    
    print("--- Books ---")
    books = list(db["books"].find({"_id": {"$regex": "trigger_test"}}))
    print(f"Found {len(books)} books matching 'trigger_test'")
    for b in books:
        print(f"Book ID: {b.get('_id')}")
        print(f"  Title: {b.get('title')}")
        print(f"  Status: {b.get('ingestion_status') or b.get('status')}")
        print(f"  Logs: {b.get('ingestion_logs')}")
        print("-" * 30)
        
    print("\n--- Ingestion Jobs ---")
    jobs = list(db["ingestion_jobs"].find({"_id": {"$regex": "trigger_test"}}))
    print(f"Found {len(jobs)} jobs matching 'trigger_test'")
    for j in jobs:
        print(f"Job ID: {j.get('_id')}")
        print(f"  Status: {j.get('status')}")
        print(f"  Logs: {j.get('logs')}")
        print("-" * 30)
        
    client.close()

if __name__ == "__main__":
    main()
