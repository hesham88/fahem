import os
import sys
from pymongo import MongoClient

def test():
    public_uri = "mongodb+srv://fahem_mcp:APdUwoATbKjxcrJa@fahemcluster.trf718.mongodb.net/fahem?retryWrites=true&w=majority&appName=FahemCluster"
    print("Testing with public URI:", public_uri)
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
