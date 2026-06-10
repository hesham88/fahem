import os
import json

path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"
sandbox_path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db_sandbox.json"

for name, db_path in [("local_db.json", path), ("local_db_sandbox.json", sandbox_path)]:
    print(f"\n==================== Inspecting {name} ====================")
    if not os.path.exists(db_path):
        print(f"File NOT found: {db_path}")
        continue
        
    with open(db_path, "r", encoding="utf-8") as f:
        db = json.load(f)
        
    books = db.get("books", [])
    subjects = db.get("subjects", [])
    curricula = db.get("curricula", [])
    libraries = db.get("libraries", [])
    
    print(f"Total Books: {len(books)}")
    print(f"Total Subjects: {len(subjects)}")
    print(f"Total Curricula: {len(curricula)}")
    print(f"Total Libraries: {len(libraries)}")
    
    python_books = []
    for b in books:
        title = b.get("title", "") or b.get("title_ar", "")
        if "python" in title.lower():
            python_books.append(b)
            
    print(f"Python books found: {len(python_books)}")
    for b in python_books:
        print(f"  - ID: {b.get('_id')}")
        print(f"    Title: {b.get('title')}")
        print(f"    Subject ID: {b.get('subject_id')}")
        print(f"    Curriculum ID: {b.get('curriculum_id')}")
        print(f"    Library ID: {b.get('library_id')}")
        print(f"    Visibility: {b.get('visibility')}")
        
    print("\nChecking if the subject IDs for Python books exist in subjects array:")
    subject_ids = {s.get("_id") for s in subjects}
    for b in python_books:
        sub_id = b.get("subject_id")
        exists = sub_id in subject_ids
        print(f"  - Subject ID '{sub_id}' exists in subjects array: {exists}")
        
    print("\nLooking at subjects related to Egypt/secondary/python:")
    for s in subjects:
        sub_id = s.get("_id", "")
        if "python" in sub_id.lower() or "egypt" in sub_id.lower() or "computer" in sub_id.lower():
            print(f"  - Subject: {s}")
