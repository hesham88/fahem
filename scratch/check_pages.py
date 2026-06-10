import json
import os

db_path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"
if os.path.exists(db_path):
    with open(db_path, "r", encoding="utf-8") as f:
        db = json.load(f)
    
    pages = db.get("book_pages", [])
    py_pages = [p for p in pages if p.get("book_id") == "openstax_python_programming"]
    print(f"Total Python pages: {len(py_pages)}")
    
    # Check details of pages 1 to 5
    for p in sorted(py_pages, key=lambda x: x.get("page_number", 0))[:5]:
        print(f"\nPage {p.get('page_number')}:")
        print(f"  Status: {p.get('status')}")
        print(f"  Has embedding: {'embedding' in p}")
        if 'embedding' in p:
            print(f"  Embedding len: {len(p['embedding'])}")
        print(f"  Has i18n: {'i18n' in p}")
        print(f"  Page hash: {p.get('pageHash')}")
else:
    print("local_db.json not found")
