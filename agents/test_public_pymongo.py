import os
import sys
from pymongo import MongoClient

def load_env_local():
    # Try to find web/.env.local and load it manually to avoid hardcoding secrets
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "../web/.env.local"),
        os.path.join(os.path.dirname(__file__), "web/.env.local"),
        os.path.join(os.getcwd(), "web/.env.local"),
        ".env.local"
    ]
    for p in possible_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            v = v.strip("'\"")
                            os.environ[k] = v
                break
            except Exception as e:
                print(f"Warning: Could not read {p}: {e}")

def test():
    load_env_local()
    public_uri = os.environ.get("MONGODB_URI")
    if not public_uri:
        print("Error: MONGODB_URI environment variable is not set and could not be loaded from .env.local")
        sys.exit(1)
        
    print("Testing with public URI from environment/config")
    try:
        client = MongoClient(public_uri, serverSelectionTimeoutMS=5000)
        db = client["fahem"]
        cols = db.list_collection_names()
        print("Success! Collections:", cols)
        
        # Print a count of subjects and books to verify content
        sub_count = db["subjects"].count_documents({})
        book_count = db["books"].count_documents({})
        print(f"Database statistics: {sub_count} subjects, {book_count} books.")
        
    except Exception as e:
        print("Failed to connect via public pymongo:", e)

if __name__ == "__main__":
    test()

