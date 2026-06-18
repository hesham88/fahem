import os
import sys
from pymongo import MongoClient

def test():
    public_uri = "mongodb+srv://fahem_mcp:RJkyLV67fo6hEqUv@fahemcluster.trf718.mongodb.net/?appName=FahemCluster"
    print("Testing with direct public URI:", public_uri)
    try:
        client = MongoClient(public_uri, serverSelectionTimeoutMS=10000)
        db = client["fahem"]
        cols = db.list_collection_names()
        print("Success! Collections:", cols)
        
        # Check active session size
        col = db["companion_sessions"]
        cursor = col.find({}, {"id": 1, "user_id": 1, "app_name": 1, "events": 1})
        for doc in cursor:
            events = doc.get("events", [])
            print(f"Session: {doc.get('id')} | User: {doc.get('user_id')} | Events Count: {len(events)}")
            
    except Exception as e:
        print("Failed to connect via public pymongo:", e)

if __name__ == "__main__":
    test()
