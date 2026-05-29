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
        cols = db.list_collection_names()
        print("Success! Collections:", cols)
    except Exception as e:
        print("Failed to connect via pymongo:", e)

if __name__ == "__main__":
    test()
