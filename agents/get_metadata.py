import sys
import json
import os

# Allow importing tools by adding parent dir to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from tools import list_database_collections, get_database_stats, get_mongodb_uri
from pymongo import MongoClient

def get_metadata(database: str = "fahem") -> dict:
    uri = get_mongodb_uri()
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        # Parse database name from URI if possible
        db_name = client.get_default_database().name if client.get_default_database() else database
    except Exception:
        db_name = database

    # 1. Collections and Names
    cols_res = list_database_collections(db_name)
    collections = cols_res.get("collections", []) if cols_res.get("status") == "success" else []
    collections_count = len(collections)
    collection_list = ", ".join(collections) if collections else "None"

    # 2. Stats & Size
    stats_res = get_database_stats(db_name)
    storage_size_str = "0 B"
    index_count = 0
    
    if stats_res.get("status") == "success":
        stats = stats_res.get("stats", {})
        data_size = stats.get("dataSize", 0)
        # Human readable size
        if data_size > 1024 * 1024:
            storage_size_str = f"{data_size / (1024 * 1024):.2f} MB"
        elif data_size > 1024:
            storage_size_str = f"{data_size / 1024:.2f} KB"
        else:
            storage_size_str = f"{data_size} B"
            
        index_count = stats.get("indexes", 0)

    return {
        "databaseName": db_name,
        "collectionsCount": str(collections_count),
        "collectionList": collection_list,
        "storageSize": storage_size_str,
        "indexCount": str(index_count),
        "status": "Connected"
    }

if __name__ == "__main__":
    meta = get_metadata()
    print(json.dumps(meta))
