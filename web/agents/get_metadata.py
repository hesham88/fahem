import sys
import json
import os
from pymongo import MongoClient

# Allow importing tools by adding parent dir to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from tools import get_mongodb_uri
except ImportError:
    from agents.tools import get_mongodb_uri

def get_metadata(database: str = "fahem") -> dict:
    uri = get_mongodb_uri()
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        # Parse database name from URI if possible
        try:
            db_name = client.get_default_database().name if client.get_default_database() else database
            if not db_name or db_name == "test":
                db_name = database
        except Exception:
            db_name = database
        
        db = client[db_name]
        
        # 1. Get Collections and Names
        collections = db.list_collection_names()
        collections_count = len(collections)
        collection_list = ", ".join(collections) if collections else "None"
        
        # 2. Get Stats & Size
        stats = db.command("dbStats")
        data_size = stats.get("totalSize", stats.get("dataSize", stats.get("storageSize", 0)))
        index_count = stats.get("indexes", 0)
        
        # Human readable size
        if data_size > 1024 * 1024:
            storage_size_str = f"{data_size / (1024 * 1024):.2f} MB"
        elif data_size > 1024:
            storage_size_str = f"{data_size / 1024:.2f} KB"
        else:
            storage_size_str = f"{data_size} B"
            
        return {
            "databaseName": db_name,
            "collectionsCount": str(collections_count),
            "collectionList": collection_list,
            "storageSize": storage_size_str,
            "indexCount": str(index_count),
            "status": "Connected"
        }
    except Exception as e:
        return {
            "databaseName": database,
            "collectionsCount": "...",
            "collectionList": "...",
            "storageSize": "...",
            "indexCount": "...",
            "status": f"Disconnected (Error: {str(e)})"
        }

if __name__ == "__main__":
    # Load env variables relative to agents path if needed
    try:
        agents_dir = os.path.dirname(os.path.abspath(__file__))
        possible_paths = [
            os.path.join(agents_dir, ".env.local"),
            os.path.join(os.path.dirname(agents_dir), ".env.local"),
            os.path.join(os.path.dirname(os.path.dirname(agents_dir)), "web", ".env.local")
        ]
        for path in possible_paths:
            if os.path.exists(path):
                with open(path, "r") as f:
                    for line in f:
                        if "=" in line and not line.strip().startswith("#"):
                            key, val = line.split("=", 1)
                            key = key.strip()
                            val = val.strip().strip('"').strip("'")
                            if key not in os.environ:
                                os.environ[key] = val
                break
    except Exception:
        pass

    meta = get_metadata()
    print(json.dumps(meta))
