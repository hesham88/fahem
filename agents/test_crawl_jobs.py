import sys
import os
import json

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCAL_DB_PATH = os.path.join(ROOT_DIR, "web", "src", "app", "api", "local_db.json")

def main():
    if not os.path.exists(LOCAL_DB_PATH):
        print("local_db.json does not exist at:", LOCAL_DB_PATH)
        return
    with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
        db = json.load(f)
    col = db.get("crawl_jobs", [])
    print("Total crawl jobs count in local DB:", len(col))
    print("\n--- LAST 5 CRAWL JOBS ---")
    sorted_jobs = sorted(col, key=lambda x: x.get("created_at", 0), reverse=True)
    for j in sorted_jobs[:5]:
        print(f"ID: {j['_id']}")
        print(f"URL: {j['url']}")
        print(f"Status: {j['status']}")
        print(f"Progress: {j.get('progress')}")
        print("Logs:")
        for log in j.get("logs", [])[-20:]:
            try:
                print(f"  {log}")
            except Exception:
                try:
                    print(f"  {log.encode('utf-8', errors='replace').decode('utf-8')}")
                except Exception:
                    print(f"  {log.encode('ascii', errors='replace').decode('ascii')}")
        print("-" * 50)

if __name__ == "__main__":
    main()
