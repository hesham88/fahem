import sys
import json
from pymongo import MongoClient

def main():
    uri = "mongodb+srv://fahem_mcp:RJkyLV67fo6hEqUv@fahemcluster-pri.trf718.mongodb.net/?appName=FahemCluster"
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    db = client["fahem_sandbox"]
    
    print("Database collections:")
    for col_name in db.list_collection_names():
        print(f" - {col_name}")
        col = db[col_name]
        print("   Indexes:")
        for idx in col.list_indexes():
            print(f"     * {idx['name']}: {idx['key']}")
            
if __name__ == "__main__":
    main()
