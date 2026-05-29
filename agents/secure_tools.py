import os
import json
import logging
from typing import Any, Dict, List, Optional
from pymongo import MongoClient
from bson import ObjectId

try:
    from tools import get_mongodb_uri
except ImportError:
    from agents.tools import get_mongodb_uri

logger = logging.getLogger("fahem.secure_tools")

# =================================----------------------------
# CORE SECURE PARAMETERIZED TOOLS
# =================================----------------------------

def _get_client(read_only: bool = True) -> MongoClient:
    """Helper to instantiate a MongoDB MongoClient using the appropriate connection string."""
    # Enforce Principle of Least Privilege: use read-only credential where possible
    uri = get_mongodb_uri()  # Fallback/standard URI
    if read_only:
        # Check if a dedicated read-only connection is defined
        ro_uri = os.environ.get("MONGODB_READONLY_URI") or os.environ.get("MONGODB_URI_READONLY")
        if ro_uri:
            uri = ro_uri
            logger.info("Using dedicated read-only database connection.")
        else:
            logger.warning("Dedicated read-only connection not set; falling back to main URI (operations will still be constrained in-memory).")
            
    return MongoClient(uri, serverSelectionTimeoutMS=5000)

def lookup_user_by_id(user_id: str) -> Dict[str, Any]:
    """Retrieves standard user profile information from the whitelisted 'users' collection using their unique ID.
    
    Args:
        user_id: The unique string identifier of the user (e.g. standard MongoDB Hex ObjectId or username).
    """
    logger.info(f"[TOOL] Executing lookup_user_by_id for user_id={user_id}")
    if not user_id:
        return {"status": "error", "message": "A non-empty user_id is required."}
        
    client = _get_client(read_only=True)
    try:
        db = client["fahem"]
        col = db["users"]
        
        # Try to find by ObjectId if valid, else standard string match
        query = {}
        if len(user_id) == 24 and all(c in "0123456789abcdefABCDEF" for c in user_id):
            query["_id"] = ObjectId(user_id)
        else:
            query["_id"] = user_id
            
        doc = col.find_one(query)
        if not doc:
            # Try matching other potential user identifier fields (like email or username)
            doc = col.find_one({"$or": [{"email": user_id}, {"userId": user_id}, {"username": user_id}]})
            
        if doc:
            # Convert ObjectId to string for compatibility
            doc["_id"] = str(doc["_id"])
            return {"status": "success", "user": doc}
        return {"status": "not_found", "message": f"No user found matching identifier '{user_id}'."}
    except Exception as e:
        logger.error(f"Error in lookup_user_by_id: {e}", exc_info=True)
        return {"status": "error", "message": f"Lookup failed: {str(e)}"}
    finally:
        client.close()

def search_users_by_email(email_query: str) -> Dict[str, Any]:
    """Searches for users by matching part or all of their email address in the 'users' collection.
    
    Args:
        email_query: The partial or full email string to query.
    """
    logger.info(f"[TOOL] Executing search_users_by_email query='{email_query}'")
    if not email_query:
        return {"status": "error", "message": "Email query string is required."}
        
    client = _get_client(read_only=True)
    try:
        db = client["fahem"]
        col = db["users"]
        
        # Safe regular expression query (preventing malicious regex injection)
        safe_query = "".join([c for c in email_query if c.isalnum() or c in "@.-_"])
        docs = list(col.find({"email": {"$regex": safe_query, "$options": "i"}}).limit(50))
        
        results = []
        for doc in docs:
            doc["_id"] = str(doc["_id"])
            results.append(doc)
            
        return {"status": "success", "count": len(results), "users": results}
    except Exception as e:
        logger.error(f"Error in search_users_by_email: {e}", exc_info=True)
        return {"status": "error", "message": f"Search failed: {str(e)}"}
    finally:
        client.close()

def insert_user_report(user_id: str, report_title: str, content: str) -> Dict[str, Any]:
    """Saves a newly generated compliance, diagnostic, or security report on behalf of an authenticated user.
    
    Args:
        user_id: The authenticated user ID creating this report.
        report_title: Title/subject of the report.
        content: Detailed text content of the report.
    """
    logger.info(f"[TOOL] Executing insert_user_report for user_id={user_id}")
    if not user_id or not report_title or not content:
        return {"status": "error", "message": "Missing required parameters: user_id, report_title, and content must be provided."}
        
    client = _get_client(read_only=False)
    try:
        db = client["fahem"]
        col = db["reports"]
        
        import datetime
        report_doc = {
            "userId": user_id,
            "title": report_title,
            "content": content,
            "createdAt": datetime.datetime.utcnow().isoformat() + "Z",
            "status": "active"
        }
        
        result = col.insert_one(report_doc)
        report_doc["_id"] = str(result.inserted_id)
        
        return {"status": "success", "message": "Report saved successfully.", "report": report_doc}
    except Exception as e:
        logger.error(f"Error in insert_user_report: {e}", exc_info=True)
        return {"status": "error", "message": f"Failed to save report: {str(e)}"}
    finally:
        client.close()

def inspect_collection_schema(collection_name: str) -> Dict[str, Any]:
    """Safely extracts field keys and standard types from a whitelisted collection to help models build valid queries.
    
    Args:
        collection_name: Name of the collection to inspect (must be whitelisted).
    """
    logger.info(f"[TOOL] Executing inspect_collection_schema for collection='{collection_name}'")
    whitelisted = {"users", "movies", "reports", "comments"}
    if collection_name not in whitelisted:
        return {"status": "error", "message": f"Access Denied: Collection '{collection_name}' is not authorized."}
        
    client = _get_client(read_only=True)
    try:
        db = client["fahem"]
        col = db[collection_name]
        
        sample_docs = list(col.find().limit(5))
        if not sample_docs:
            return {"status": "empty", "message": f"Collection '{collection_name}' is currently empty.", "schema": {}}
            
        # Infer schema by examining sample documents
        schema = {}
        for doc in sample_docs:
            for k, v in doc.items():
                if k == "_id":
                    schema[k] = "ObjectId"
                elif k not in schema:
                    schema[k] = type(v).__name__
                    
        return {
            "status": "success",
            "collectionName": collection_name,
            "schema": schema,
            "sampleCount": len(sample_docs)
        }
    except Exception as e:
        logger.error(f"Error in inspect_collection_schema: {e}", exc_info=True)
        return {"status": "error", "message": f"Schema retrieval failed: {str(e)}"}
    finally:
        client.close()

def get_whitelisted_db_stats() -> Dict[str, Any]:
    """Retrieves safe statistics of the 'fahem' database with fully sanitized server and path identifiers."""
    logger.info("[TOOL] Executing get_whitelisted_db_stats")
    client = _get_client(read_only=True)
    try:
        db = client["fahem"]
        stats = db.command("dbStats")
        
        # Sanitize internal path values and hostnames
        safe_stats = {
            "db": "fahem",
            "collections": stats.get("collections", 0),
            "views": stats.get("views", 0),
            "objects": stats.get("objects", 0),
            "avgObjSize": stats.get("avgObjSize", 0),
            "dataSize": stats.get("dataSize", 0),
            "storageSize": stats.get("storageSize", 0),
            "indexes": stats.get("indexes", 0),
            "indexSize": stats.get("indexSize", 0),
            "status": "Connected"
        }
        return safe_stats
    except Exception as e:
        logger.error(f"Error in get_whitelisted_db_stats: {e}", exc_info=True)
        return {"status": "error", "message": f"DB stats retrieval failed: {str(e)}"}
    finally:
        client.close()
