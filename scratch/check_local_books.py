import json
import os

path = "C:/Users/hesh1/Desktop/fahem/web/src/app/api/local_db.json"
out_path = "C:/Users/hesh1/Desktop/fahem/scratch/local_books_info.txt"

with open(path, "r", encoding="utf-8") as f:
    db = json.load(f)

lines = []
lines.append("Keys in local_db.json:")
lines.append(str(list(db.keys())))

for key in ["libraries", "curricula", "subjects", "books"]:
    items = db.get(key, [])
    lines.append(f"\n{key} count: {len(items)}")
    for item in items[:15]:
        lines.append(f"  - {item.get('_id') or item.get('id')}: {item.get('title') or item.get('name')}")

lines.append("\nAll books in local_db.json['books'] with python in title:")
found = False
for book in db.get("books", []):
    title = book.get("title", "") or book.get("title_ar", "")
    if "python" in title.lower():
        found = True
        lines.append(f"  - ID: {book.get('_id') or book.get('id')}, Title: {title}, Subject: {book.get('subject_id')}, Curriculum: {book.get('curriculum_id')}, Visibility: {book.get('visibility')}")

if not found:
    lines.append("No books with 'python' in title found in local_db.json['books']!")

with open(out_path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print("Done! Info written to scratch/local_books_info.txt")
