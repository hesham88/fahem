import json

def main():
    with open('web/src/app/api/local_db.json', 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    target_id = "book_introduction_to_python_programming_1780850976048"
    print(f"Searching for ID: {target_id}")
    for key, val in db.items():
        if isinstance(val, list):
            for idx, item in enumerate(val):
                if isinstance(item, dict):
                    # check all fields recursively
                    item_str = json.dumps(item)
                    if target_id in item_str or "1780850976048" in item_str:
                        print(f"Found in collection '{key}' at index {idx}:")
                        print(f"  _id: {item.get('_id') or item.get('id')}")
                        print(f"  Keys: {list(item.keys())}")
                        if "title" in item:
                            print(f"  title: {item.get('title')}")
                        if "chapters" in item:
                            print(f"  chapters count: {len(item['chapters'])}")
                            if len(item['chapters']) > 0:
                                print(f"  First chapter: {item['chapters'][0]}")
                        print("-" * 40)

if __name__ == "__main__":
    main()
