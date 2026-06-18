import json
import os

seed_path = r"C:\Users\hesh1\Desktop\fahem\agents\python_book_seed.json"
if os.path.exists(seed_path):
    with open(seed_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print("Seed file type:", type(data))
    if isinstance(data, dict):
        print("Keys:", data.keys())
        # Print first few elements of books if it's a dict
        for k, v in data.items():
            if isinstance(v, list) and v:
                print(f"Key '{k}' is a list of length {len(v)}, first item type: {type(v[0])}")
                if isinstance(v[0], dict):
                    print("First item keys:", v[0].keys())
                    print("First item _id:", v[0].get("_id"), "title:", v[0].get("title"))
    elif isinstance(data, list):
        print("List length:", len(data))
        print("First item keys:", data[0].keys() if len(data) > 0 and isinstance(data[0], dict) else "N/A")
        print("First item _id:", data[0].get("_id") if len(data) > 0 else "N/A")
else:
    print("python_book_seed.json not found.")
