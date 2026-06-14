import json
import sys

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"
    with open(path, "r", encoding="utf-8") as f:
        db = json.load(f)
        
    print("=== SUBJECTS IN LOCAL_DB.JSON ===")
    for s in db.get("subjects", []):
        print(f"ID: {s.get('_id') or s.get('id')}")
        print(f"  Name: {s.get('name')}")
        print(f"  Name AR: {s.get('name_ar')}")
        print(f"  Category: {s.get('category')}")
        print("-" * 30)

if __name__ == "__main__":
    main()
