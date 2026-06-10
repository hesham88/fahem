import os
import json
from pymongo import MongoClient

def get_mongodb_uri():
    try:
        secrets_path = r"C:\Users\hesh1\Desktop\fahem\ignore\mongodb_secrets.json"
        if os.path.exists(secrets_path):
            with open(secrets_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                val = data.get("MONGODB_URI")
                if val:
                    return val
    except Exception as e:
        print(f"Error reading secrets: {e}")
    return None

def main():
    uri = get_mongodb_uri()
    if not uri:
        print("MongoDB URI not found.")
        return
    client = MongoClient(uri)
    db = client["fahem"]
    
    print("--- Searching for books with 'Python' in title on production database ('fahem') ---")
    query = {"title": {"$regex": "python", "$options": "i"}}
    books = list(db["books"].find(query))
    
    print(f"Found {len(books)} books:")
    for b in books:
        print(f"\nID: {b.get('_id')}")
        print(f"Title: {b.get('title')}")
        print(f"Subject ID: {b.get('subject_id') or b.get('subjectId')}")
        print(f"Status: {b.get('ingestion_status') or b.get('status')}")
        print(f"Source URL: {b.get('source_url')}")
        print(f"Total Pages: {b.get('total_pages') or b.get('totalPages')}")
        print(f"Processed Pages: {b.get('processed_pages') or b.get('processedPages')}")
        print(f"Chapters Count: {len(b.get('chapters', []))}")
        
    client.close()

if __name__ == "__main__":
    main()
