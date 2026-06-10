import json
import os

path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"
out_path = r"C:\Users\hesh1\Desktop\fahem\scratch\python_details.txt"

with open(path, "r", encoding="utf-8") as f:
    db = json.load(f)

lines = []

# 1. Search for Python books
books = db.get("books", [])
python_books = []
for b in books:
    title = b.get("title", "") or b.get("title_ar", "")
    if "python" in title.lower():
        python_books.append(b)

lines.append(f"Found {len(python_books)} Python books:")
for b in python_books:
    lines.append(f"Book ID: {b.get('_id')}")
    lines.append(f"  Title: {b.get('title')}")
    lines.append(f"  Subject ID: {b.get('subject_id')}")
    lines.append(f"  Curriculum ID: {b.get('curriculum_id')}")
    lines.append(f"  Library ID: {b.get('library_id')}")
    lines.append(f"  Visibility: {b.get('visibility')}")

# 2. Search for Curricula
curricula = db.get("curricula", [])
lines.append(f"\nTotal Curricula: {len(curricula)}")
for c in curricula:
    c_id = c.get("_id") or c.get("id")
    if "egypt" in str(c_id).lower() or "python" in str(c_id).lower():
        lines.append(f"  Curriculum: {c}")

# 3. Search for subjects
subjects = db.get("subjects", [])
lines.append(f"\nTotal Subjects: {len(subjects)}")
for s in subjects:
    s_id = s.get("_id") or s.get("id")
    if "python" in str(s_id).lower() or "egypt" in str(s_id).lower():
        lines.append(f"  Subject: {s}")

with open(out_path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print("Completed!")
