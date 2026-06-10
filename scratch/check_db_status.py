import json
import os
import sys

# Set standard outputs to utf-8
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

db_path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"
if os.path.exists(db_path):
    with open(db_path, "r", encoding="utf-8") as f:
        db = json.load(f)
    
    jobs = db.get("ingestion_jobs", [])
    py_jobs = [j for j in jobs if "openstax_python_programming" in j.get("_id", "")]
    print("--- INGESTION JOBS ---")
    for j in py_jobs:
        print(f"ID: {j.get('_id')}")
        print(f"Status: {j.get('status')}")
        print(f"Step: {j.get('step')}")
        print(f"Progress: {j.get('progress')}%")
        print(f"Processed: {j.get('processed_pages')}/{j.get('total_pages')}")
        last_log = j.get('logs', [])[-1] if j.get('logs') else 'No logs'
        # safely encode-decode or print repr to avoid terminal crash
        print(f"Last log: {repr(last_log)}")
        
    pages = db.get("book_pages", [])
    py_pages = [p for p in pages if p.get("book_id") == "openstax_python_programming"]
    embedded_pages = [p for p in py_pages if p.get("status") == "embedded" and p.get("embedding")]
    print("\n--- BOOK PAGES ---")
    print(f"Total pages in DB for openstax_python_programming: {len(py_pages)}")
    print(f"Total embedded pages: {len(embedded_pages)}")
else:
    print("local_db.json not found")
