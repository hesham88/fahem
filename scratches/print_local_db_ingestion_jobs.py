import json
import os

db_path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"
if os.path.exists(db_path):
    with open(db_path, "r", encoding="utf-8") as f:
        db = json.load(f)
        
    jobs = db.get("ingestion_jobs", [])
    print(f"Found {len(jobs)} ingestion jobs.")
    for job in jobs:
        # print jobs that contain "python" or matching ID
        if "python" in job.get("_id", "").lower() or "python" in str(job.get("metadata", {}).get("title", "")).lower():
            print(f"\n=================== JOB: {job.get('_id')} ===================")
            print(f"Status: {job.get('status')}")
            print(f"Current Step: {job.get('current_step')}")
            print(f"Progress: {job.get('progress')}%")
            print(f"Processed Pages: {job.get('processed_pages')} / {job.get('total_pages')}")
            print("Logs:")
            for log in job.get("logs", [])[-15:]:
                print("  ", log)
else:
    print("local_db.json not found")
