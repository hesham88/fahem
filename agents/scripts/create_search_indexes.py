import os
import sys
import time
from pymongo import MongoClient

# Ensure we can import from agents folder
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "agents"))

try:
    from tools import get_mongodb_uri
except ImportError:
    try:
        from agents.tools import get_mongodb_uri
    except ImportError:
        def get_mongodb_uri(read_only=False):
            return os.environ.get("MONGODB_URI", "mongodb://localhost:27017")

def main():
    uri = get_mongodb_uri()
    print("Fetching MongoDB connection string...")
    # Hide credential part for secure logging
    if "@" in uri:
        parts = uri.split("@")
        masked_uri = "mongodb://***:***@" + parts[-1]
    else:
        masked_uri = uri
    print(f"Connecting to database with URI: {masked_uri}")
    
    client = MongoClient(uri)
    databases = ["fahem", "fahem_sandbox"]
    
    for db_name in databases:
        print(f"\n=========================================")
        print(f"Processing database: {db_name}")
        print(f"=========================================")
        db = client[db_name]
        
        # Check if book_pages exists
        collections = db.list_collection_names()
        if "book_pages" not in collections:
            print(f"Warning: 'book_pages' collection not found in {db_name}. Creating it...")
            db.create_collection("book_pages")
        
        # Definition for Atlas Search Index
        index_definition = {
            "fields": [
                { "type": "vector", "path": "embedding", "numDimensions": 3072, "similarity": "cosine" },
                { "type": "filter", "path": "book_id" },
                { "type": "filter", "path": "subject_id" },
                { "type": "filter", "path": "curriculum_id" },
                { "type": "filter", "path": "status" }
            ]
        }
        
        print("Checking existing search indexes...")
        try:
            indexes = list(db.command("listSearchIndexes", collection="book_pages"))
            print(f"Found {len(indexes)} existing search indexes in {db_name}.book_pages:")
            for idx in indexes:
                print(f"  - Name: {idx.get('name')}, Status: {idx.get('status')}, Type: {idx.get('type')}")
        except Exception as e:
            print(f"Could not list search indexes: {e}")
            indexes = []
            
        # Check if our index already exists
        existing_index = next((idx for idx in indexes if idx.get("name") == "vector_index_book_pages"), None)
        
        if existing_index:
            print(f"Index 'vector_index_book_pages' already exists with status: {existing_index.get('status')}")
        else:
            print(f"Creating 'vector_index_book_pages' search index...")
            try:
                res = db.command(
                    "createSearchIndexes",
                    collection="book_pages",
                    indexes=[
                        {
                            "name": "vector_index_book_pages",
                            "type": "vectorSearch",
                            "definition": index_definition
                        }
                    ]
                )
                print(f"Create search index command returned: {res}")
            except Exception as e:
                print(f"Error creating search index: {e}")
                
        # Poll status
        print("Polling search index status...")
        for i in range(5):
            try:
                indexes = list(db.command("listSearchIndexes", collection="book_pages"))
                our_idx = next((idx for idx in indexes if idx.get("name") == "vector_index_book_pages"), None)
                if our_idx:
                    status = our_idx.get("status")
                    print(f"  [Attempt {i+1}] Status of 'vector_index_book_pages': {status}")
                    if status == "READY":
                        print("Index is READY! 🚀")
                        break
                else:
                    print(f"  [Attempt {i+1}] Index 'vector_index_book_pages' not found in listing yet.")
            except Exception as e:
                print(f"  [Attempt {i+1}] Query error: {e}")
            time.sleep(3)

if __name__ == "__main__":
    main()
