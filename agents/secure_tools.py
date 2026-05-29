import os
import json
import logging
import datetime
from typing import Any, Dict, List, Optional

try:
    from tools import get_mongodb_uri
except ImportError:
    from agents.tools import get_mongodb_uri

logger = logging.getLogger("fahem.secure_tools")

# =================================----------------------------
# CORE AGENT-DRIVEN PORT PROTOCOL (ZERO RAW PYMONGO)
# =================================----------------------------

def get_mcp_toolset():
    """Helper to lazily load mcp_toolset from agent setup and prevent circular imports."""
    try:
        from mongodb_agent.agent import mcp_toolset
    except ImportError:
        try:
            from agents.mongodb_agent.agent import mcp_toolset
        except ImportError:
            from agent import mcp_toolset
    return mcp_toolset

_mcp_connected = False

async def _run_mcp_tool(tool_name: str, args: dict) -> Any:
    """Invokes a specific MCP tool asynchronously via standard programmatic delegation."""
    global _mcp_connected
    mcp_toolset = get_mcp_toolset()
    tools = await mcp_toolset.get_tools()
    tools_map = {t.name: t for t in tools}
    
    if tool_name not in tools_map:
        raise ValueError(f"Tool '{tool_name}' not found in MCP toolset.")
        
    # Preemptively connect if not yet initialized
    if not _mcp_connected and tool_name != "connect":
        if "connect" in tools_map:
            try:
                uri = get_mongodb_uri()
                await tools_map["connect"].run_async(
                    args={"connectionStringOrClusterName": uri},
                    tool_context=None
                )
                _mcp_connected = True
            except Exception as e:
                logger.warning(f"Pre-emptive MCP connect tool failed: {e}")
                
    res = await tools_map[tool_name].run_async(args=args, tool_context=None)
    
    # Parse standard MCP text content structure into structured python objects
    if isinstance(res, dict) and "content" in res:
        for item in res["content"]:
            if isinstance(item, dict) and item.get("type") == "text":
                text_val = item.get("text", "")
                text_val_stripped = text_val.strip()
                if (text_val_stripped.startswith("{") and text_val_stripped.endswith("}")) or \
                   (text_val_stripped.startswith("[") and text_val_stripped.endswith("]")):
                    try:
                        return json.loads(text_val_stripped)
                    except Exception:
                        pass
                return text_val
    return res

# =================================----------------------------
# CORE SECURE PARAMETERIZED TOOLS (ASYNC / AGENT-ONLY PROTOCOL)
# =================================----------------------------

async def lookup_user_by_id(user_id: str) -> Dict[str, Any]:
    """Retrieves standard user profile information from the whitelisted 'users' collection using their unique ID.
    
    Args:
        user_id: The unique string identifier of the user (e.g. standard MongoDB Hex ObjectId or username).
    """
    logger.info(f"[TOOL] Executing lookup_user_by_id for user_id={user_id}")
    if not user_id:
        return {"status": "error", "message": "A non-empty user_id is required."}
        
    try:
        # Check if user_id represents a 24-character hexadecimal ObjectId
        query = {}
        if len(user_id) == 24 and all(c in "0123456789abcdefABCDEF" for c in user_id):
            query = {"_id": {"$oid": user_id}}
        else:
            query = {"_id": user_id}
            
        docs = await _run_mcp_tool("find", {"database": "fahem", "collection": "users", "filter": query, "limit": 1})
        
        # If not found by direct _id, run standard fallback checks on email, userId or username
        if not docs or not isinstance(docs, list) or len(docs) == 0:
            fallback_query = {"$or": [{"email": user_id}, {"userId": user_id}, {"username": user_id}]}
            docs = await _run_mcp_tool("find", {"database": "fahem", "collection": "users", "filter": fallback_query, "limit": 1})
            
        if docs and isinstance(docs, list) and len(docs) > 0:
            doc = docs[0]
            if isinstance(doc.get("_id"), dict) and "$oid" in doc["_id"]:
                doc["_id"] = doc["_id"]["$oid"]
            return {"status": "success", "user": doc}
            
        return {"status": "not_found", "message": f"No user found matching identifier '{user_id}'."}
    except Exception as e:
        logger.error(f"Error in lookup_user_by_id: {e}", exc_info=True)
        return {"status": "error", "message": f"Lookup failed: {str(e)}"}

async def search_users_by_email(email_query: str) -> Dict[str, Any]:
    """Searches for users by matching part or all of their email address in the 'users' collection.
    
    Args:
        email_query: The partial or full email string to query.
    """
    logger.info(f"[TOOL] Executing search_users_by_email query='{email_query}'")
    if not email_query:
        return {"status": "error", "message": "Email query string is required."}
        
    try:
        # Safe regular expression query (preventing malicious regex injection)
        safe_query = "".join([c for c in email_query if c.isalnum() or c in "@.-_"])
        query = {"email": {"$regex": safe_query, "$options": "i"}}
        
        docs = await _run_mcp_tool("find", {"database": "fahem", "collection": "users", "filter": query, "limit": 50})
        
        results = []
        if isinstance(docs, list):
            for doc in docs:
                if isinstance(doc, dict):
                    if isinstance(doc.get("_id"), dict) and "$oid" in doc["_id"]:
                        doc["_id"] = doc["_id"]["$oid"]
                    results.append(doc)
            
        return {"status": "success", "count": len(results), "users": results}
    except Exception as e:
        logger.error(f"Error in search_users_by_email: {e}", exc_info=True)
        return {"status": "error", "message": f"Search failed: {str(e)}"}

async def insert_user_report(
    user_id: Optional[str] = None,
    report_title: Optional[str] = None,
    content: Optional[str] = None,
    name: Optional[str] = None,
    email: Optional[str] = None,
    subject: Optional[str] = None,
    description: Optional[str] = None,
    timestamp: Optional[str] = None
) -> Dict[str, Any]:
    """Saves a newly generated compliance, diagnostic, issue, or security report inside the 'reports' collection.
    
    This tool supports recording user issue reports with flexible fields including name, email, subject, description, and timestamp.
    
    Args:
        user_id: The authenticated user ID creating this report.
        report_title: Title or subject of the report (maps to 'title' or 'subject' field).
        content: Detailed text content or description of the report (maps to 'content' or 'description' field).
        name: Name of the person reporting the issue.
        email: Email address of the person reporting the issue.
        subject: Subject of the issue report (fallback or alternate for report_title).
        description: Description of the issue report (fallback or alternate for content).
        timestamp: Isoformatted timestamp when the report was created (fallback or alternate for createdAt).
    """
    logger.info(f"[TOOL] Executing insert_user_report with user_id={user_id}, email={email}")
    
    # Require at least some identifying fields and description/content fields
    has_identity = bool(user_id or email or name)
    has_text = bool(report_title or subject or content or description)
    
    if not has_identity or not has_text:
        return {"status": "error", "message": "Missing required parameters: A user identifier (user_id, email, or name) and text fields (subject or description) must be provided."}
        
    try:
        final_userId = user_id or email or name or "anonymous"
        final_title = report_title or subject or "User Issue Report"
        final_content = content or description or "No description provided."
        final_createdAt = timestamp or datetime.datetime.utcnow().isoformat() + "Z"
        
        report_doc = {
            "userId": final_userId,
            "title": final_title,
            "content": final_content,
            "createdAt": final_createdAt,
            "status": "active"
        }
        
        # Explicitly support standard fields requested by prompt parameters
        if name is not None:
            report_doc["name"] = name
        if email is not None:
            report_doc["email"] = email
        if subject is not None:
            report_doc["subject"] = subject
        if description is not None:
            report_doc["description"] = description
        if timestamp is not None:
            report_doc["timestamp"] = timestamp
            
        await _run_mcp_tool("insert-many", {"database": "fahem", "collection": "reports", "documents": [report_doc]})
        
        return {"status": "success", "message": "Report saved successfully.", "report": report_doc}
    except Exception as e:
        logger.error(f"Error in insert_user_report: {e}", exc_info=True)
        return {"status": "error", "message": f"Failed to save report: {str(e)}"}

async def inspect_collection_schema(collection_name: str) -> Dict[str, Any]:
    """Safely extracts field keys and standard types from a whitelisted collection to help models build valid queries.
    
    Args:
        collection_name: Name of the collection to inspect (must be whitelisted).
    """
    logger.info(f"[TOOL] Executing inspect_collection_schema for collection='{collection_name}'")
    whitelisted = {"users", "movies", "reports", "comments"}
    if collection_name not in whitelisted:
        return {"status": "error", "message": f"Access Denied: Collection '{collection_name}' is not authorized."}
        
    try:
        # Prioritize the native collection-schema tool of the MCP Server
        schema_res = await _run_mcp_tool("collection-schema", {"database": "fahem", "collection": collection_name})
        return {
            "status": "success",
            "collectionName": collection_name,
            "schema": schema_res,
            "sampleCount": 1
        }
    except Exception as e:
        logger.warning(f"Native MCP collection-schema tool failed, falling back to sample parsing: {e}")
        # Robust fallback using standard find tool
        try:
            docs = await _run_mcp_tool("find", {"database": "fahem", "collection": collection_name, "limit": 5})
            if not docs or not isinstance(docs, list) or len(docs) == 0:
                return {"status": "empty", "message": f"Collection '{collection_name}' is currently empty.", "schema": {}}
                
            schema = {}
            for doc in docs:
                if isinstance(doc, dict):
                    for k, v in doc.items():
                        if k == "_id":
                            schema[k] = "ObjectId"
                        elif k not in schema:
                            schema[k] = type(v).__name__
                            
            return {
                "status": "success",
                "collectionName": collection_name,
                "schema": schema,
                "sampleCount": len(docs)
            }
        except Exception as fallback_err:
            logger.error(f"Error in inspect_collection_schema fallback: {fallback_err}", exc_info=True)
            return {"status": "error", "message": f"Schema retrieval failed: {str(fallback_err)}"}

async def get_whitelisted_db_stats() -> Dict[str, Any]:
    """Retrieves safe statistics of the 'fahem' database with fully sanitized server and path identifiers."""
    logger.info("[TOOL] Executing get_whitelisted_db_stats")
    try:
        stats = await _run_mcp_tool("db-stats", {"database": "fahem"})
        
        # Sanitize internal path values and hostnames by reconstructing safe schema output
        safe_stats = {
            "db": "fahem",
            "collections": stats.get("collections", 0) if isinstance(stats, dict) else 0,
            "views": stats.get("views", 0) if isinstance(stats, dict) else 0,
            "objects": stats.get("objects", 0) if isinstance(stats, dict) else 0,
            "avgObjSize": stats.get("avgObjSize", 0) if isinstance(stats, dict) else 0,
            "dataSize": stats.get("dataSize", 0) if isinstance(stats, dict) else 0,
            "storageSize": stats.get("storageSize", 0) if isinstance(stats, dict) else 0,
            "indexes": stats.get("indexes", 0) if isinstance(stats, dict) else 0,
            "indexSize": stats.get("indexSize", 0) if isinstance(stats, dict) else 0,
            "status": "Connected"
        }
        return safe_stats
    except Exception as e:
        logger.error(f"Error in get_whitelisted_db_stats: {e}", exc_info=True)
        return {"status": "error", "message": f"DB stats retrieval failed: {str(e)}"}
