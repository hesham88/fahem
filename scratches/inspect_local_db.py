import json
import os
import sys

# Ensure stdout handles UTF-8
if sys.platform.startswith('win'):
    import codecs
    sys.stdout.reconfigure(encoding='utf-8')

db_path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"

if not os.path.exists(db_path):
    print("Database path does not exist.")
    exit(1)

print(f"Reading {db_path}...")
with open(db_path, "r", encoding="utf-8") as f:
    db = json.load(f)

emails_of_interest = ["fred78@gmail.com", "sebafreediving@gmail.com", "hesham1988@gmail.com"]

for email in emails_of_interest:
    print(f"\nSearching for occurrences of '{email}':")
    # Let's search recursively where this email is found
    def search_recursive(obj, path=""):
        occurrences = []
        if isinstance(obj, dict):
            for k, v in obj.items():
                occurrences.extend(search_recursive(v, f"{path}.{k}" if path else k))
        elif isinstance(obj, list):
            for idx, item in enumerate(obj):
                occurrences.extend(search_recursive(item, f"{path}[{idx}]"))
        elif isinstance(obj, str):
            if email.lower() in obj.lower():
                occurrences.append((path, obj))
        return occurrences

    results = search_recursive(db)
    print(f"Found {len(results)} occurrences:")
    for path, val in results[:50]:
        print(f"  Path: {path} | Value snippet: {repr(val[:120])}")
    if len(results) > 50:
        print(f"  ... and {len(results) - 50} more.")
