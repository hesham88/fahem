from pymongo import MongoClient
import sys
import os

# Add agents dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from tools import get_mongodb_uri

def main():
    uri = get_mongodb_uri()
    print("Masked URI prefix:", uri.split("@")[-1] if "@" in uri else uri)
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        # List all databases
        dbs = client.list_database_names()
        print("Available databases:", dbs)
        for db_name in dbs:
            db = client[db_name]
            cols = db.list_collection_names()
            print(f"Database: {db_name}, Collections: {cols}")
            for col in cols:
                print(f"  Collection: {col}, Document Count: {db[col].count_documents({})}")
    except Exception as e:
        print("Failed:", e)

if __name__ == "__main__":
    main()
