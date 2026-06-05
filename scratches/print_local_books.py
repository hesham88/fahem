import json
import os
import sys

# Force UTF-8 stdout
if sys.version_info >= (3, 7):
    sys.stdout.reconfigure(encoding='utf-8')

db_path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"
if os.path.exists(db_path):
    with open(db_path, "r", encoding="utf-8") as f:
        db = json.load(f)
    
    print("Books in local database:")
    for b in db.get("books", []):
        print(f"\nID: {b.get('_id')}")
        print(f"Title: {b.get('title')}")
        title_ar = b.get('title_ar', '')
        print(f"Title Ar: {title_ar}")
        print(f"Total Pages: {b.get('total_pages')}")
        print(f"Ingestion Status: {b.get('ingestion_status')}")
        print(f"Processed Pages: {b.get('processed_pages')}")
else:
    print("local_db.json not found")
