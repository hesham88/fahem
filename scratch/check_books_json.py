import json

path = "C:/Users/hesh1/Desktop/fahem/web/src/app/api/local_db.json"
with open(path, "r", encoding="utf-8") as f:
    db = json.load(f)

print("Keys in local_db.json:")
print(db.keys())

for key in ["libraries", "curricula", "subjects", "books"]:
    items = db.get(key, [])
    print(f"\n{key} count: {len(items)}")
    for item in items[:10]:
        print(f"  - {item.get('_id') or item.get('id')}: {item.get('title') or item.get('name')}")

print("\nAll books in local_db.json['books'] with python in title:")
found = False
for book in db.get("books", []):
    title = book.get("title", "") or book.get("title_ar", "")
    if "python" in title.lower():
        found = True
        print(f"  - ID: {book.get('_id') or book.get('id')}, Title: {title}, Subject: {book.get('subject_id')}, Curriculum: {book.get('curriculum_id')}, Visibility: {book.get('visibility')}")

if not found:
    print("No books with 'python' in title found in local_db.json['books']!")
