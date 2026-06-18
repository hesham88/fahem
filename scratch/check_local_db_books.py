import json
import os

db_path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"
if os.path.exists(db_path):
    with open(db_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print("Listing all books in local_db.json:")
    for b in data.get("books", []):
        if "Python" in b.get("title", "") or "python" in b.get("title", "").lower():
            print(f"- ID: {b.get('_id')}, Title: {b.get('title')}, Subject ID: {b.get('subject_id')}")
else:
    print("local_db.json not found at expected path.")
