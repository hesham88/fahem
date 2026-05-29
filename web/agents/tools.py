import os
import json
from pymongo import MongoClient

def get_mongodb_uri() -> str:
    """Resolves the MongoDB connection string from environment or local ignored configurations."""
    # 1. Environment variable (standard production / GCP Secret Manager flow)
    uri = os.environ.get("MONGODB_URI")
    if uri:
        return uri
    
    # 2. Local ignored secrets file
    try:
        # Resolve path relative to agents/ directory (checking both workspace root and web/ nested levels)
        agents_dir = os.path.dirname(os.path.abspath(__file__))
        # Try parent directory (if agents is at root) and parent's parent (if agents is inside web)
        secrets_path = os.path.join(os.path.dirname(agents_dir), "ignore", "mongodb_secrets.json")
        if not os.path.exists(secrets_path):
            secrets_path = os.path.join(os.path.dirname(os.path.dirname(agents_dir)), "ignore", "mongodb_secrets.json")
            
        if os.path.exists(secrets_path):
            with open(secrets_path, "r") as f:
                data = json.load(f)
                val = data.get("MONGODB_URI", "")
                if val:
                    return val
    except Exception:
        pass
    
    # 3. Local Next.js env file
    try:
        env_path = os.path.join(os.path.dirname(agents_dir), "web", ".env.local")
        if not os.path.exists(env_path):
            env_path = os.path.join(os.path.dirname(agents_dir), ".env.local")
            
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                for line in f:
                    if line.startswith("MONGODB_URI="):
                        val = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if val:
                            return val
    except Exception:
        pass
        
    return "mongodb://localhost:27017"

def get_database_stats(database: str = "fahem") -> dict:
    """
    Returns usage statistics reflecting the state of a single MongoDB database.
    
    Args:
        database: The name of the database to retrieve stats for.
    """
    uri = get_mongodb_uri()
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        db = client[database]
        # Run dbStats command
        stats = db.command("dbStats")
        # Mask sensitive server path details if present in stats
        if "raw" in stats:
            stats["raw"] = "[MASKED_RAW_METADATA]"
        return {
            "status": "success",
            "database": database,
            "stats": stats
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to retrieve database stats: {str(e)}"
        }

def list_database_collections(database: str = "fahem") -> dict:
    """
    Lists all collections present inside a given MongoDB database.
    
    Args:
        database: The name of the database.
    """
    uri = get_mongodb_uri()
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        db = client[database]
        collections = db.list_collection_names()
        return {
            "status": "success",
            "database": database,
            "collections": collections
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to list collections: {str(e)}"
        }

def get_collection_schema(database: str = "fahem", collection: str = "") -> dict:
    """
    Analyzes documents in a collection and derives a basic JSON schema representation.
    
    Args:
        database: The name of the database.
        collection: The name of the collection to analyze.
    """
    if not collection:
        return {"status": "error", "message": "Collection name must be provided."}
        
    uri = get_mongodb_uri()
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        db = client[database]
        col = db[collection]
        
        # Sample the first 10 documents
        sample = list(col.find().limit(10))
        if not sample:
            return {
                "status": "success",
                "database": database,
                "collection": collection,
                "schema": {},
                "message": "Collection is empty."
            }
            
        schema = {}
        for doc in sample:
            for key, val in doc.items():
                if key not in schema:
                    schema[key] = {
                        "type": type(val).__name__,
                        "occurrences": 1
                    }
                else:
                    schema[key]["occurrences"] += 1
                    
        return {
            "status": "success",
            "database": database,
            "collection": collection,
            "schema": schema
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to retrieve collection schema: {str(e)}"
        }
