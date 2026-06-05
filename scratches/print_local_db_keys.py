import json
import os

db_path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"
if os.path.exists(db_path):
    with open(db_path, "r", encoding="utf-8") as f:
        db = json.load(f)
        
    print("Database top-level keys:")
    for key, val in db.items():
        if isinstance(val, list):
            print(f"  {key}: {len(val)} items")
        else:
            print(f"  {key}: type {type(val)}")
else:
    print("local_db.json not found")
