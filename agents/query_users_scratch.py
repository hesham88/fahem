import os
import sys
from pymongo import MongoClient

# Add current folder to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from tools import get_mongodb_uri

def test():
    resolved_uri = get_mongodb_uri()
    print("Testing with resolved URI:", resolved_uri)
    try:
        client = MongoClient(resolved_uri, serverSelectionTimeoutMS=5000)
        db = client["fahem"]
        users = list(db["users"].find())
        print(f"Total users found: {len(users)}")
        for u in users:
            print({k: v for k, v in u.items() if k != "_id"})
    except Exception as e:
        print("Failed to query users:", e)

if __name__ == "__main__":
    test()
