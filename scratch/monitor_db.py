import json
import time
import os
import sys

# Reconfigure stdout to support UTF-8 on Windows
sys.stdout.reconfigure(encoding='utf-8')

db_path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"
start = time.time()

print("Monitoring DB Status for 5 minutes...", flush=True)

while time.time() - start < 300:
    if os.path.exists(db_path):
        try:
            with open(db_path, "r", encoding="utf-8") as f:
                db = json.load(f)
            
            jobs = db.get("ingestion_jobs", [])
            py_jobs = [j for j in jobs if "openstax_python_programming" in j.get("_id", "")]
            if py_jobs:
                job = py_jobs[0]
                status = job.get("status")
                processed = job.get("processed_pages")
                total = job.get("total_pages")
                print(f"Status: {status} | Processed: {processed}/{total} | Time: {time.time()-start:.1f}s", flush=True)
                if status in ["completed", "failed"]:
                    break
        except Exception as e:
            print(f"Error: {e}", flush=True)
            pass
    time.sleep(5)
