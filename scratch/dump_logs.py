import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

db_path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"
if os.path.exists(db_path):
    with open(db_path, "r", encoding="utf-8") as f:
        db = json.load(f)
    
    jobs = db.get("ingestion_jobs", [])
    py_jobs = [j for j in jobs if "openstax_python_programming" in j.get("_id", "")]
    for j in py_jobs:
        print(f"--- LOGS FOR JOB: {j.get('_id')} ---")
        for log in j.get('logs', []):
            print(log)
else:
    print("local_db.json not found")
