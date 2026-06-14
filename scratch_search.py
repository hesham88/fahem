import json
import os

db_path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"

if os.path.exists(db_path):
    print("Loading database...")
    with open(db_path, "r", encoding="utf-8") as f:
        db = json.load(f)
        
    pages = db.get("book_pages", [])
    if pages:
        print(f"Total pages: {len(pages)}")
        p = pages[0]
        print("\n--- Keys in a single page document ---")
        for k, v in p.items():
            val_type = type(v).__name__
            val_len = len(str(v)) if v is not None else 0
            print(f"Key: {k:<20} | Type: {val_type:<10} | Length in str: {val_len}")
            if k == "blocks" and isinstance(v, list) and len(v) > 0:
                print("  Sample block keys:", list(v[0].keys()))
    else:
        print("No book pages found in local_db.json")
else:
    print("Database file not found!")
