import sys
import json
import os
import asyncio
import logging

# Add agents directory to sys.path to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from tools import get_mongodb_uri
except ImportError:
    from agents.tools import get_mongodb_uri

logger = logging.getLogger("fahem.agent_communications")

def get_mcp_toolset():
    """Helper to lazily load mcp_toolset and avoid circular imports."""
    try:
        from mongodb_agent.agent import mcp_toolset
    except ImportError:
        try:
            from agents.mongodb_agent.agent import mcp_toolset
        except ImportError:
            from agent import mcp_toolset
    return mcp_toolset

_mcp_connected = False
_indexes_tuned = False

db_engine = None
try:
    from mongodb_engine import MongoDBEngine
    db_engine = MongoDBEngine(database_name="fahem")
except ImportError:
    try:
        from agents.mongodb_engine import MongoDBEngine
        db_engine = MongoDBEngine(database_name="fahem")
    except Exception as e:
        logger.warning(f"Failed to import or initialize direct MongoDBEngine: {e}")
except Exception as e:
    logger.warning(f"Failed to initialize direct MongoDBEngine: {e}")


async def _run_mcp_tool(tool_name: str, args: dict) -> json:
    """Helper to programmatically invoke a specific MCP tool inside mcp_toolset, with high-performance direct MongoDB connection fallback."""
    global _mcp_connected
    
    # Run guardrail check first (collapsing direct PyMongo and MCP writes to one gated path)
    try:
        from guardrails import before_tool_callback
        class DummyTool:
            def __init__(self, name):
                self.name = name
        before_tool_callback(DummyTool(tool_name), args or {})
    except PermissionError as pe:
        logger.error(f"[SECURITY] Direct tool run blocked: {pe}")
        raise pe
    except Exception as ge:
        logger.warning(f"Guardrail pre-check error: {ge}")
        
    # Direct high-performance PyMongo & Schema-validated execution if db_engine is connected
    if db_engine and db_engine._db is not None:
        try:
            db = db_engine._db
            if tool_name == "connect":
                return "Connected directly."
            
            elif tool_name == "create-index":
                coll_name = args["collection"]
                definition = args.get("definition", [])
                if definition:
                    keys = list(definition[0].get("keys", {}).items())
                    name = args.get("name")
                    db[coll_name].create_index(keys, name=name, background=True)
                return "Index created."
                
            elif tool_name == "list-collections":
                return db.list_collection_names()
                
            elif tool_name == "db-stats":
                return db.command("dbStats")
                
            elif tool_name == "insert-many":
                coll_name = args["collection"]
                docs = args["documents"]
                if coll_name == "users":
                    from mongodb_engine import UserProfileSchema
                    for doc in docs:
                        doc.pop("_id", None)
                        if "username" in doc and doc["username"]:
                            doc["username_clean"] = str(doc["username"]).strip().lower()
                        if "email" in doc and doc["email"]:
                            doc["email"] = str(doc["email"]).strip().lower()
                        UserProfileSchema(**doc)
                res = db[coll_name].insert_many(docs)
                return {"insertedIds": [str(x) for x in res.inserted_ids]}
                
            elif tool_name == "find":
                coll_name = args["collection"]
                filt = args.get("filter", {})
                options = args.get("options", {}) or {}
                limit = args.get("limit") or options.get("limit", 0)
                sort = options.get("sort") or args.get("sort")
                
                # Translate mongo $oid if present in filter
                def translate_oids(d):
                    if isinstance(d, dict):
                        if "$oid" in d:
                            from bson import ObjectId
                            return ObjectId(d["$oid"])
                        return {k: translate_oids(v) for k, v in d.items()}
                    elif isinstance(d, list):
                        return [translate_oids(x) for x in d]
                    return d
                    
                filt = translate_oids(filt)
                
                find_cursor = db[coll_name].find(filt)
                if sort:
                    if isinstance(sort, dict):
                        sort_list = list(sort.items())
                    else:
                        sort_list = sort
                    find_cursor = find_cursor.sort(sort_list)
                if limit:
                    find_cursor = find_cursor.limit(limit)
                    
                docs = list(find_cursor)
                for doc in docs:
                    if "_id" in doc:
                        doc["_id"] = {"$oid": str(doc["_id"])}
                return docs
                
            elif tool_name == "update-many":
                coll_name = args["collection"]
                filt = args.get("filter", {})
                update = args.get("update", {})
                upsert = args.get("upsert", False)
                
                # Enforce validation for users collection update!
                if coll_name == "users":
                    from mongodb_engine import UserProfileSchema
                    set_data = update.get("$set", {})
                    if set_data:
                        user_id = filt.get("userId") or set_data.get("userId")
                        if user_id:
                            existing = db["users"].find_one({"userId": user_id}) or {}
                            existing.pop("_id", None)
                            flat_profile = {**existing, **set_data, "userId": user_id}
                            flat_profile["username_clean"] = str(flat_profile.get("username", "")).strip().lower()
                            flat_profile["email"] = str(flat_profile.get("email", "")).strip().lower()
                            # Validate
                            validated = UserProfileSchema(**flat_profile)
                            update["$set"] = validated.model_dump(by_alias=True, exclude_none=True)
                            
                res = db[coll_name].update_many(filt, update, upsert=upsert)
                return {
                    "matchedCount": res.matched_count,
                    "modifiedCount": res.modified_count,
                    "upsertedId": str(res.upserted_id) if res.upserted_id else None
                }
                
            elif tool_name == "delete-many":
                coll_name = args["collection"]
                filt = args.get("filter", {})
                res = db[coll_name].delete_many(filt)
                return {"deletedCount": res.deleted_count}
                
            else:
                logger.warning(f"[agent_communications] Unknown tool '{tool_name}' for direct execution; falling back to MCP.")
        except Exception as direct_err:
            logger.warning(f"[agent_communications] Direct PyMongo translation failed for '{tool_name}': {direct_err}; falling back to MCP.")

    # FALLBACK: standard MCP Tool execution path
    mcp_toolset = get_mcp_toolset()
    tools = await mcp_toolset.get_tools()
    tools_map = {t.name: t for t in tools}
    
    if tool_name not in tools_map:
        raise ValueError(f"Tool '{tool_name}' not found in MCP toolset.")
        
    if not _mcp_connected and tool_name != "connect":
        if "connect" in tools_map:
            try:
                uri = get_mongodb_uri()
                await tools_map["connect"].run_async(
                    args={"connectionString": uri},
                    tool_context=None
                )
                _mcp_connected = True
            except Exception as e:
                logger.warning(f"Pre-emptive MCP connect tool failed: {e}")
                
    res = await tools_map[tool_name].run_async(args=args, tool_context=None)
    
    is_err = False
    err_msg = ""
    if isinstance(res, dict):
        if res.get("isError") or res.get("is_error"):
            is_err = True
            err_msg = str(res)
    else:
        if getattr(res, "isError", False) or getattr(res, "is_error", False):
            is_err = True
            err_msg = str(res)
            
    content_list = []
    if isinstance(res, dict) and "content" in res:
        content_list = res["content"]
    elif hasattr(res, "content"):
        content_list = res.content
        
    text_val = None
    if content_list:
        for item in content_list:
            item_type = item.get("type") if isinstance(item, dict) else getattr(item, "type", None)
            item_text = item.get("text") if isinstance(item, dict) else getattr(item, "text", "")
            if item_type == "text" and item_text:
                text_val = item_text
                text_val_stripped = text_val.strip()
                if text_val_stripped.startswith("Error") or "exception" in text_val.lower():
                    is_err = True
                    err_msg = text_val_stripped
                break

    if is_err:
        raise ValueError(f"MCP tool '{tool_name}' failed: {err_msg}")
        
    if text_val is not None:
        text_val_stripped = text_val.strip()
        try:
            return json.loads(text_val_stripped)
        except Exception:
            pass
            
        # Robust substring JSON extraction (handling potential text wrapper around array/object)
        start_arr = text_val_stripped.find("[")
        end_arr = text_val_stripped.rfind("]")
        if start_arr != -1 and end_arr != -1 and end_arr > start_arr:
            try:
                return json.loads(text_val_stripped[start_arr:end_arr+1])
            except Exception:
                pass
                
        start_obj = text_val_stripped.find("{")
        end_obj = text_val_stripped.rfind("}")
        if start_obj != -1 and end_obj != -1 and end_obj > start_obj:
            try:
                return json.loads(text_val_stripped[start_obj:end_obj+1])
            except Exception:
                pass
                
        return text_val
        
    return res


async def database_telemetry_engine(database: str = "fahem") -> dict:
    """Fetches MongoDB database stats, collection lists, and index metrics (Database Telemetry & Diagnostic Agent)."""
    try:
        # 1. Establish database connection via MCP Connect tool
        uri = get_mongodb_uri()
        try:
            await _run_mcp_tool("connect", {"connectionString": uri})
        except Exception as conn_err:
            logger.warning(f"Connection over MCP failed: {conn_err}")
            
        # Ensure database index-tuning is applied once in the container lifecycle
        global _indexes_tuned
        if not _indexes_tuned:
            try:
                logger.info("[agent_communications] Initiating auto-healing database schema index tuning...")
                # 1. Users collection
                await _run_mcp_tool("create-index", {
                    "database": database,
                    "collection": "users",
                    "definition": [{"type": "classic", "keys": {"userId": 1}}],
                    "name": "idx_userId_unique"
                })
                await _run_mcp_tool("create-index", {
                    "database": database,
                    "collection": "users",
                    "definition": [{"type": "classic", "keys": {"username": 1}}],
                    "name": "idx_username_unique"
                })
                await _run_mcp_tool("create-index", {
                    "database": database,
                    "collection": "users",
                    "definition": [{"type": "classic", "keys": {"username_clean": 1}}],
                    "name": "idx_username_clean_unique"
                })
                # 2. Messages collection (composite)
                await _run_mcp_tool("create-index", {
                    "database": database,
                    "collection": "messages",
                    "definition": [{"type": "classic", "keys": {"senderId": 1, "recipientId": 1, "timestamp": 1}}],
                    "name": "idx_sender_recipient_timestamp"
                })
                await _run_mcp_tool("create-index", {
                    "database": database,
                    "collection": "messages",
                    "definition": [{"type": "classic", "keys": {"recipientId": 1, "senderId": 1, "timestamp": 1}}],
                    "name": "idx_recipient_sender_timestamp"
                })
                # 3. Chat sessions
                await _run_mcp_tool("create-index", {
                    "database": database,
                    "collection": "chat_sessions",
                    "definition": [{"type": "classic", "keys": {"userId": 1}}],
                    "name": "idx_chats_userId"
                })
                # 4. User activities
                await _run_mcp_tool("create-index", {
                    "database": database,
                    "collection": "user_activities",
                    "definition": [{"type": "classic", "keys": {"userId": 1}}],
                    "name": "idx_activities_userId"
                })
                # 5. Token telemetry
                await _run_mcp_tool("create-index", {
                    "database": database,
                    "collection": "token_telemetry",
                    "definition": [{"type": "classic", "keys": {"userId": 1}}],
                    "name": "idx_telemetry_userId"
                })
                _indexes_tuned = True
                logger.info("[agent_communications] Database schema index tuning completed successfully! 🚀")
                await log_audit_event("DATABASE", "System", "Database schema indexes tuned successfully.", "Created user, message composite, chat sessions, user activities, and token telemetry indexes.")
            except Exception as index_err:
                logger.warning(f"[agent_communications] Non-critical database index-tuning warning: {index_err}")
            
        # 2. Get active collections over MCP
        collections = []
        try:
            col_res = await _run_mcp_tool("list-collections", {"database": database})
            if isinstance(col_res, list):
                # Standard array of collection names or objects
                collections = [c.get("name") if isinstance(c, dict) else str(c) for c in col_res]
            elif isinstance(col_res, dict) and "collections" in col_res:
                collections = col_res["collections"]
            elif isinstance(col_res, str):
                try:
                    parsed = json.loads(col_res)
                    if isinstance(parsed, list):
                        collections = parsed
                except Exception:
                    collections = [c.strip() for c in col_res.split(",") if c.strip()]
        except Exception as col_err:
            logger.error(f"Failed to list collections over MCP: {col_err}")
            
        collections_count = len(collections)
        collection_list = ", ".join(collections) if collections else "None"
        
        # 3. Retrieve DB-level statistics over MCP
        data_size = 0
        index_count = 0
        try:
            stats_res = await _run_mcp_tool("db-stats", {"database": database})
            if isinstance(stats_res, dict):
                data_size = stats_res.get("totalSize", stats_res.get("dataSize", stats_res.get("storageSize", 0)))
                index_count = stats_res.get("indexes", 0)
        except Exception as stats_err:
            logger.error(f"Failed to get db stats over MCP: {stats_err}")
            
        # Human readable size conversion
        if data_size > 1024 * 1024:
            storage_size_str = f"{data_size / (1024 * 1024):.2f} MB"
        elif data_size > 1024:
            storage_size_str = f"{data_size / 1024:.2f} KB"
        else:
            storage_size_str = f"{data_size} B"
            
        return {
            "databaseName": database,
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

async def log_audit_event(category: str, agent: str, message: str, details: str = None):
    """Inserts a real audit/telemetry log record into the fahem.audit_logs collection using MCP."""
    if db_engine and db_engine._db is not None:
        try:
            await db_engine.log_audit_event(category, agent, message, details)
            return
        except Exception as e:
            logger.warning(f"Direct log_audit_event failed: {e}; falling back to MCP.")
    try:
        from datetime import datetime
        doc = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "category": category,
            "agent": agent,
            "message": message,
        }
        if details:
            doc["details"] = details
            
        await _run_mcp_tool("insert-many", {
            "database": "fahem",
            "collection": "audit_logs",
            "documents": [doc]
        })
        logger.info(f"[MCP AUDIT LOGGED] {category} • {agent} - {message}")
    except Exception as err:
        logger.warning(f"Failed to log audit event over MCP: {err}")

async def get_audit_logs() -> list:
    """Fetches up to 100 audit log records from fahem.audit_logs collection using MCP."""
    if db_engine and db_engine._db is not None:
        try:
            logs = await db_engine.get_audit_logs()
            return [l.model_dump(by_alias=True) for l in logs]
        except Exception as e:
            logger.warning(f"Direct get_audit_logs failed: {e}; falling back to MCP.")
    try:
        logs = await _run_mcp_tool("find", {
            "database": "fahem",
            "collection": "audit_logs",
            "filter": {},
            "options": {
                "sort": {"timestamp": -1},
                "limit": 100
            }
        })
        if isinstance(logs, list):
            return logs
        elif isinstance(logs, dict) and "documents" in logs:
            return logs["documents"]
        elif isinstance(logs, dict) and "result" in logs:
            return logs["result"]
        return []
    except Exception as err:
        logger.warning(f"Failed to fetch audit logs over MCP: {err}")
        return []

async def log_user_activity(user_id: str, user_email: str, action: str, status: str, details: str = None) -> bool:
    """Inserts a user activity log record into user_activities collection."""
    if db_engine and db_engine._db is not None:
        try:
            return await db_engine.log_user_activity(user_id, user_email, action, status, details)
        except Exception as e:
            logger.warning(f"Direct log_user_activity failed: {e}; falling back to MCP.")
    try:
        from datetime import datetime
        doc = {
            "userId": user_id,
            "userEmail": user_email,
            "action": action,
            "status": status,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        if details:
            doc["details"] = details
            
        await _run_mcp_tool("insert-many", {
            "database": "fahem",
            "collection": "user_activities",
            "documents": [doc]
        })
        logger.info(f"[MCP ACTIVITY LOGGED] {user_email} • {action} - {status}")
        return True
    except Exception as err:
        logger.warning(f"Failed to log user activity: {err}")
        return False

async def get_user_activities(user_id: str) -> list:
    """Fetches up to 100 recent activities for a specific user."""
    if db_engine and db_engine._db is not None:
        try:
            activities = await db_engine.get_user_activities(user_id)
            return [a.model_dump(by_alias=True) for a in activities]
        except Exception as e:
            logger.warning(f"Direct get_user_activities failed: {e}; falling back to MCP.")
    try:
        res = await _run_mcp_tool("find", {
            "database": "fahem",
            "collection": "user_activities",
            "filter": {"userId": user_id},
            "options": {
                "sort": {"timestamp": -1},
                "limit": 100
            }
        })
        if isinstance(res, list):
            return res
        elif isinstance(res, dict) and "documents" in res:
            return res["documents"]
        return []
    except Exception as err:
        logger.warning(f"Failed to fetch user activities: {err}")
        return []

async def get_all_activities() -> list:
    """Fetches up to 200 recent activities globally (for Superadmins)."""
    if db_engine and db_engine._db is not None:
        try:
            activities = await db_engine.get_all_activities()
            return [a.model_dump(by_alias=True) for a in activities]
        except Exception as e:
            logger.warning(f"Direct get_all_activities failed: {e}; falling back to MCP.")
    try:
        res = await _run_mcp_tool("find", {
            "database": "fahem",
            "collection": "user_activities",
            "filter": {},
            "options": {
                "sort": {"timestamp": -1},
                "limit": 200
            }
        })
        if isinstance(res, list):
            return res
        elif isinstance(res, dict) and "documents" in res:
            return res["documents"]
        return []
    except Exception as err:
        logger.warning(f"Failed to fetch all activities: {err}")
        return []

async def save_chat_session(session_id: str, user_id: str, user_email: str, title: str, messages: list) -> bool:
    """Creates or updates a user chat session in chat_sessions collection."""
    success = False
    if db_engine and db_engine._db is not None:
        try:
            success = await db_engine.save_chat_session(session_id, user_id, user_email, title, messages)
            if success:
                return True
        except Exception as e:
            logger.warning(f"Direct save_chat_session failed: {e}; falling back to MCP.")
    try:
        from datetime import datetime
        now_str = datetime.utcnow().isoformat() + "Z"
        
        existing = await _run_mcp_tool("find", {
            "database": "fahem",
            "collection": "chat_sessions",
            "filter": {"sessionId": session_id}
        })
        
        # Check if existing list has records
        is_existing = False
        if isinstance(existing, list) and len(existing) > 0:
            is_existing = True
        elif isinstance(existing, dict) and "documents" in existing and len(existing["documents"]) > 0:
            is_existing = True
            
        if is_existing:
            await _run_mcp_tool("update-many", {
                "database": "fahem",
                "collection": "chat_sessions",
                "filter": {"sessionId": session_id},
                "update": {
                    "$set": {
                        "title": title,
                        "messages": messages,
                        "updatedAt": now_str
                    }
                }
            })
            logger.info(f"[MCP SESSION UPDATED] {session_id} - Title: {title}")
        else:
            doc = {
                "sessionId": session_id,
                "userId": user_id,
                "userEmail": user_email,
                "title": title,
                "messages": messages,
                "createdAt": now_str,
                "updatedAt": now_str
            }
            await _run_mcp_tool("insert-many", {
                "database": "fahem",
                "collection": "chat_sessions",
                "documents": [doc]
            })
            logger.info(f"[MCP SESSION CREATED] {session_id} - Title: {title}")
        return True
    except Exception as err:
        logger.warning(f"Failed to save chat session: {err}")
        return False

async def rename_chat_session(session_id: str, new_title: str) -> bool:
    """Renames a user chat session in chat_sessions collection."""
    success = False
    if db_engine and db_engine._db is not None:
        try:
            success = await db_engine.rename_chat_session(session_id, new_title)
            if success:
                return True
        except Exception as e:
            logger.warning(f"Direct rename_chat_session failed: {e}; falling back to MCP.")
    try:
        from datetime import datetime
        now_str = datetime.utcnow().isoformat() + "Z"
        
        await _run_mcp_tool("update-many", {
            "database": "fahem",
            "collection": "chat_sessions",
            "filter": {"sessionId": session_id},
            "update": {
                "$set": {
                    "title": new_title,
                    "updatedAt": now_str
                }
            }
        })
        logger.info(f"[MCP SESSION RENAMED] {session_id} - New Title: {new_title}")
        return True
    except Exception as err:
        logger.error(f"Failed to rename chat session via MCP: {err}")
        return False

async def get_user_sessions(user_id: str) -> list:
    """Fetches all chat sessions for a specific user (summary list)."""
    if db_engine and db_engine._db is not None:
        try:
            sessions = await db_engine.get_user_sessions(user_id)
            list_res = []
            for s in sessions:
                list_res.append({
                    "sessionId": s.sessionId,
                    "userId": s.userId,
                    "userEmail": s.userEmail,
                    "title": s.title,
                    "createdAt": s.createdAt,
                    "updatedAt": s.updatedAt,
                    "messageCount": len(s.messages)
                })
            return list_res
        except Exception as e:
            logger.warning(f"Direct get_user_sessions failed: {e}; falling back to MCP.")
    try:
        res = await _run_mcp_tool("find", {
            "database": "fahem",
            "collection": "chat_sessions",
            "filter": {"userId": user_id},
            "options": {
                "sort": {"updatedAt": -1}
            }
        })
        docs = []
        if isinstance(res, list):
            docs = res
        elif isinstance(res, dict) and "documents" in res:
            docs = res["documents"]
            
        list_res = []
        for doc in docs:
            list_res.append({
                "sessionId": doc.get("sessionId"),
                "userId": doc.get("userId"),
                "userEmail": doc.get("userEmail"),
                "title": doc.get("title"),
                "createdAt": doc.get("createdAt"),
                "updatedAt": doc.get("updatedAt"),
                "messageCount": len(doc.get("messages", []))
            })
        return list_res
    except Exception as err:
        logger.warning(f"Failed to fetch user sessions: {err}")
        return []

async def get_session_detail(session_id: str) -> dict:
    """Fetches details (including full message history) of a session."""
    if db_engine and db_engine._db is not None:
        try:
            session = await db_engine.get_session_detail(session_id)
            if session:
                return session.model_dump(by_alias=True)
        except Exception as e:
            logger.warning(f"Direct get_session_detail failed: {e}; falling back to MCP.")
    try:
        res = await _run_mcp_tool("find", {
            "database": "fahem",
            "collection": "chat_sessions",
            "filter": {"sessionId": session_id}
        })
        docs = []
        if isinstance(res, list):
            docs = res
        elif isinstance(res, dict) and "documents" in res:
            docs = res["documents"]
            
        if docs and len(docs) > 0:
            return docs[0]
        return {}
    except Exception as err:
        logger.warning(f"Failed to fetch session detail: {err}")
        return {}

async def delete_session(session_id: str) -> bool:
    """Deletes a specific chat session."""
    if db_engine and db_engine._db is not None:
        try:
            return await db_engine.delete_session(session_id)
        except Exception as e:
            logger.warning(f"Direct delete_session failed: {e}; falling back to MCP.")
    try:
        await _run_mcp_tool("delete-many", {
            "database": "fahem",
            "collection": "chat_sessions",
            "filter": {"sessionId": session_id}
        })
        logger.info(f"[MCP SESSION DELETED] {session_id}")
        return True
    except Exception as err:
        logger.warning(f"Failed to delete session: {err}")
        return False

async def log_token_usage(user_id: str, user_email: str, prompt_tokens: int, completion_tokens: int, total_tokens: int, model: str, run_type: str) -> bool:
    """Logs token usage metrics for telemetry and reporting."""
    if db_engine and db_engine._db is not None:
        try:
            return await db_engine.log_token_usage(user_id, user_email, prompt_tokens, completion_tokens, total_tokens, model, run_type)
        except Exception as e:
            logger.warning(f"Direct log_token_usage failed: {e}; falling back to MCP.")
    try:
        from datetime import datetime
        doc = {
            "userId": user_id,
            "userEmail": user_email,
            "promptTokens": int(prompt_tokens),
            "completionTokens": int(completion_tokens),
            "totalTokens": int(total_tokens),
            "model": model,
            "type": run_type,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        await _run_mcp_tool("insert-many", {
            "database": "fahem",
            "collection": "token_telemetry",
            "documents": [doc]
        })
        logger.info(f"[MCP TOKENS LOGGED] {user_email} • {run_type} • Model: {model} • Total: {total_tokens}")
        return True
    except Exception as err:
        logger.warning(f"Failed to log token usage: {err}")
        return False

async def get_user_token_stats(user_id: str) -> dict:
    """Calculates daily, weekly, monthly, and overall token usage stats for a user."""
    from datetime import datetime, timedelta
    try:
        now = datetime.utcnow()
        today_start = (now.replace(hour=0, minute=0, second=0, microsecond=0)).isoformat() + "Z"
        seven_days_ago = (now - timedelta(days=7)).isoformat() + "Z"
        thirty_days_ago = (now - timedelta(days=30)).isoformat() + "Z"
        
        logs = await _run_mcp_tool("find", {
            "database": "fahem",
            "collection": "token_telemetry",
            "filter": {"userId": user_id}
        })
        
        docs = []
        if isinstance(logs, list):
            docs = logs
        elif isinstance(logs, dict) and "documents" in logs:
            docs = logs["documents"]
            
        daily_prompt = 0
        daily_comp = 0
        daily_total = 0
        
        weekly_prompt = 0
        weekly_comp = 0
        weekly_total = 0
        
        monthly_prompt = 0
        monthly_comp = 0
        monthly_total = 0
        
        total_prompt = 0
        total_comp = 0
        total_total = 0
        
        for doc in docs:
            pt = int(doc.get("promptTokens", 0))
            ct = int(doc.get("completionTokens", 0))
            tt = int(doc.get("totalTokens", 0))
            ts = doc.get("timestamp", "")
            
            total_prompt += pt
            total_comp += ct
            total_total += tt
            
            if ts >= today_start:
                daily_prompt += pt
                daily_comp += ct
                daily_total += tt
                
            if ts >= seven_days_ago:
                weekly_prompt += pt
                weekly_comp += ct
                weekly_total += tt
                
            if ts >= thirty_days_ago:
                monthly_prompt += pt
                monthly_comp += ct
                monthly_total += tt
                
        return {
            "daily": {"prompt": daily_prompt, "completion": daily_comp, "total": daily_total},
            "weekly": {"prompt": weekly_prompt, "completion": weekly_comp, "total": weekly_total},
            "monthly": {"prompt": monthly_prompt, "completion": monthly_comp, "total": monthly_total},
            "total": {"prompt": total_prompt, "completion": total_comp, "total": total_total}
        }
    except Exception as err:
        logger.error(f"Failed to aggregate token stats: {err}")
        return {
            "daily": {"prompt": 0, "completion": 0, "total": 0},
            "weekly": {"prompt": 0, "completion": 0, "total": 0},
            "monthly": {"prompt": 0, "completion": 0, "total": 0},
            "total": {"prompt": 0, "completion": 0, "total": 0}
        }

async def get_global_token_stats() -> dict:
    """Calculates global daily, weekly, monthly, and overall token usage stats with user breakdown (Superadmins)."""
    from datetime import datetime, timedelta
    try:
        now = datetime.utcnow()
        today_start = (now.replace(hour=0, minute=0, second=0, microsecond=0)).isoformat() + "Z"
        seven_days_ago = (now - timedelta(days=7)).isoformat() + "Z"
        thirty_days_ago = (now - timedelta(days=30)).isoformat() + "Z"
        
        logs = await _run_mcp_tool("find", {
            "database": "fahem",
            "collection": "token_telemetry",
            "filter": {}
        })
        
        docs = []
        if isinstance(logs, list):
            docs = logs
        elif isinstance(logs, dict) and "documents" in logs:
            docs = logs["documents"]
            
        daily_total = 0
        weekly_total = 0
        monthly_total = 0
        lifetime_total = 0
        
        user_breakdown = {}
        history_days = {}
        for i in range(7):
            day_str = (now - timedelta(days=i)).strftime("%Y-%m-%d")
            history_days[day_str] = 0

        for doc in docs:
            tt = int(doc.get("totalTokens", 0))
            ts = doc.get("timestamp", "")
            email = doc.get("userEmail", "anonymous")
            if not email:
                email = "anonymous"
            
            lifetime_total += tt
            if ts >= today_start:
                daily_total += tt
            if ts >= seven_days_ago:
                weekly_total += tt
            if ts >= thirty_days_ago:
                monthly_total += tt
                
            user_breakdown[email] = user_breakdown.get(email, 0) + tt
            
            # Extract date portion (YYYY-MM-DD) from timestamp
            if ts and len(ts) >= 10:
                doc_date = ts[:10]
                if doc_date in history_days:
                    history_days[doc_date] += tt
            
        breakdown_list = [{"email": k, "tokens": v} for k, v in user_breakdown.items()]
        breakdown_list.sort(key=lambda x: x["tokens"], reverse=True)
        
        history_list = [{"date": k, "tokens": v} for k, v in history_days.items()]
        history_list.sort(key=lambda x: x["date"]) # chronological order
        
        return {
            "daily": daily_total,
            "weekly": weekly_total,
            "monthly": monthly_total,
            "total": lifetime_total,
            "userBreakdown": breakdown_list[:10],
            "history": history_list
        }
    except Exception as err:
        logger.error(f"Failed to get global token stats: {err}")
        return {
            "daily": 0,
            "weekly": 0,
            "monthly": 0,
            "total": 0,
            "userBreakdown": []
        }

async def get_user_profile(user_id: str = None, username: str = None, email: str = None) -> dict:
    """Fetches user profile from the 'users' collection by userId, email, or username."""
    if db_engine and db_engine._db is not None:
        try:
            profile = await db_engine.get_user_profile(user_id=user_id, username=username, email=email)
            if profile:
                return profile.model_dump(by_alias=True)
            return {}
        except Exception as e:
            logger.warning(f"Direct get_user_profile failed: {e}; falling back to MCP.")
    try:
        filt = {}
        if user_id and email:
            filt = {
                "$or": [
                    {"userId": user_id},
                    {"email": email.strip().lower()},
                    {"email": email.strip()}
                ]
            }
        elif user_id:
            filt["userId"] = user_id
        elif email:
            filt["email"] = email.strip().lower()
        elif username:
            username_clean = username.strip().lower()
            filt = {"username_clean": username_clean}
        else:
            return {}

        res = await _run_mcp_tool("find", {
            "database": "fahem",
            "collection": "users",
            "filter": filt
        })
        docs = []
        if isinstance(res, list):
            docs = res
        elif isinstance(res, dict) and "documents" in res:
            docs = res["documents"]
        elif isinstance(res, dict) and "result" in res:
            docs = res["result"]
            
        if docs and len(docs) > 0:
            return docs[0]

        # Fallback: if username was provided but no doc found, try to query by userId
        if username:
            res_fallback = await _run_mcp_tool("find", {
                "database": "fahem",
                "collection": "users",
                "filter": {"userId": username}
            })
            docs_fallback = []
            if isinstance(res_fallback, list):
                docs_fallback = res_fallback
            elif isinstance(res_fallback, dict) and "documents" in res_fallback:
                docs_fallback = res_fallback["documents"]
            elif isinstance(res_fallback, dict) and "result" in res_fallback:
                docs_fallback = res_fallback["result"]
                
            if docs_fallback and len(docs_fallback) > 0:
                return docs_fallback[0]

            # Fallback 2: check if email prefix matches username
            import re
            res_fallback_email = await _run_mcp_tool("find", {
                "database": "fahem",
                "collection": "users",
                "filter": {"email": {"$regex": f"^{re.escape(username.strip().lower())}@", "$options": "i"}}
            })
            docs_fallback_email = []
            if isinstance(res_fallback_email, list):
                docs_fallback_email = res_fallback_email
            elif isinstance(res_fallback_email, dict) and "documents" in res_fallback_email:
                docs_fallback_email = res_fallback_email["documents"]
            elif isinstance(res_fallback_email, dict) and "result" in res_fallback_email:
                docs_fallback_email = res_fallback_email["result"]

            if docs_fallback_email and len(docs_fallback_email) > 0:
                return docs_fallback_email[0]

        return {}
    except Exception as err:
        logger.error(f"Error fetching user profile for {user_id or username or email}: {err}", exc_info=True)
        # Raise database errors so they bubble up and are not treated as "user not found"
        raise err

async def check_username_availability(username: str, exclude_user_id: str = None) -> bool:
    """Checks if a username is available (i.e. not taken by any other user)."""
    if db_engine and db_engine._db is not None:
        try:
            return await db_engine.check_username_availability(username, exclude_user_id)
        except Exception as e:
            logger.warning(f"Direct check_username_availability failed: {e}; falling back to MCP.")
    try:
        if not username or not username.strip():
            return False
        import re
        username_clean = username.strip().lower()
        escaped_username = re.escape(username.strip())
        
        username_query = {
            "$or": [
                {"username_clean": username_clean},
                {"username": {"$regex": f"^{escaped_username}$", "$options": "i"}}
            ]
        }
        
        if exclude_user_id:
            filt = {
                "$and": [
                    username_query,
                    {"userId": {"$ne": exclude_user_id}}
                ]
            }
        else:
            filt = username_query
            
        res = await _run_mcp_tool("find", {
            "database": "fahem",
            "collection": "users",
            "filter": filt
        })
        docs = []
        if isinstance(res, list):
            docs = res
        elif isinstance(res, dict) and "documents" in res:
            docs = res["documents"]
        elif isinstance(res, dict) and "result" in res:
            docs = res["result"]
            
        return len(docs) == 0
    except Exception as err:
        logger.error(f"Error checking username availability for {username}: {err}", exc_info=True)
        raise err

async def save_user_profile(user_id: str, data: dict) -> bool:
    """Saves or updates a user profile in the 'users' collection using atomic upsert to prevent duplicates."""
    if db_engine and db_engine._db is not None:
        try:
            return await db_engine.save_user_profile(user_id, data)
        except ValueError as e:
            raise e
        except Exception as e:
            logger.warning(f"Direct save_user_profile failed: {e}; falling back to MCP.")
    try:
        from datetime import datetime
        now_str = datetime.utcnow().isoformat() + "Z"
        
        # Check username uniqueness first
        if "username" in data and data["username"]:
            username = str(data["username"]).strip()
            if username:
                is_avail = await check_username_availability(username, exclude_user_id=user_id)
                if not is_avail:
                    raise ValueError(f"Username '{username}' is already taken by another user.")

        # Ensure username_clean is stored alongside username
        if "username" in data and data["username"]:
            data["username_clean"] = str(data["username"]).strip().lower()
        if "email" in data and data["email"]:
            data["email"] = str(data["email"]).strip().lower()
            
        # Construct update payload
        filt = {"userId": user_id}
        update_data = {**data, "userId": user_id, "updatedAt": now_str}
        update_data.pop("_id", None)  # Clean mongo internal field
        
        update_doc = {
            "$set": update_data,
            "$setOnInsert": {"createdAt": now_str}
        }
        
        await _run_mcp_tool("update-many", {
            "database": "fahem",
            "collection": "users",
            "filter": filt,
            "update": update_doc,
            "upsert": True
        })
        logger.info(f"[MCP PROFILE UPSERTED] {user_id}")
        return True
    except ValueError as e:
        raise e
    except Exception as err:
        logger.error(f"Failed to save user profile for {user_id}: {err}", exc_info=True)
        return False

async def delete_user_account(user_id: str, email: str) -> bool:
    """GDPR compliant deletion of all user records across all collection types."""
    if db_engine and db_engine._db is not None:
        try:
            return await db_engine.delete_user_account(user_id, email)
        except Exception as e:
            logger.warning(f"Direct delete_user_account failed: {e}; falling back to MCP.")
    try:
        # Delete user profile
        await _run_mcp_tool("delete-many", {
            "database": "fahem",
            "collection": "users",
            "filter": {"userId": user_id}
        })
        # Delete chat sessions
        await _run_mcp_tool("delete-many", {
            "database": "fahem",
            "collection": "chat_sessions",
            "filter": {"userId": user_id}
        })
        # Delete activities
        await _run_mcp_tool("delete-many", {
            "database": "fahem",
            "collection": "user_activities",
            "filter": {"userId": user_id}
        })
        # Delete telemetry
        await _run_mcp_tool("delete-many", {
            "database": "fahem",
            "collection": "token_telemetry",
            "filter": {"userId": user_id}
        })
        # Delete chat messages
        await _run_mcp_tool("delete-many", {
            "database": "fahem",
            "collection": "messages",
            "filter": {
                "$or": [
                    {"senderId": user_id},
                    {"recipientId": user_id}
                ]
            }
        })
        logger.info(f"[MCP GDPR DELETION COMPLETED] User ID: {user_id}")
        return True
    except Exception as err:
        logger.warning(f"Failed to delete user account: {err}")
        return False

async def get_all_users() -> list:
    """Fetches list of all registered users on the platform."""
    if db_engine and db_engine._db is not None:
        try:
            users = await db_engine.get_all_users()
            return [u.model_dump(by_alias=True) for u in users]
        except Exception as e:
            logger.warning(f"Direct get_all_users failed: {e}; falling back to MCP.")
    try:
        res = await _run_mcp_tool("find", {
            "database": "fahem",
            "collection": "users",
            "filter": {}
        })
        docs = []
        if isinstance(res, list):
            docs = res
        elif isinstance(res, dict) and "documents" in res:
            docs = res["documents"]
        elif isinstance(res, dict) and "result" in res:
            docs = res["result"]
        return docs
    except Exception as err:
        logger.warning(f"Failed to fetch all users: {err}")
        return []

async def add_friend(user_id: str, friend_id: str) -> bool:
    """Adds a bidirectional friendship between user_id and friend_id."""
    if db_engine and db_engine._db is not None:
        try:
            return await db_engine.add_friend(user_id, friend_id)
        except Exception as e:
            logger.warning(f"Direct add_friend failed: {e}; falling back to MCP.")
    try:
        # 1. Update user_id's friends list
        await _run_mcp_tool("update-many", {
            "database": "fahem",
            "collection": "users",
            "filter": {"userId": user_id},
            "update": {"$addToSet": {"friends": friend_id}}
        })
        # 2. Update friend_id's friends list
        await _run_mcp_tool("update-many", {
            "database": "fahem",
            "collection": "users",
            "filter": {"userId": friend_id},
            "update": {"$addToSet": {"friends": user_id}}
        })
        logger.info(f"[MCP BI-FRIENDSHIP ESTABLISHED] {user_id} <-> {friend_id}")
        return True
    except Exception as err:
        logger.warning(f"Failed to add friend: {err}")
        return False

async def remove_friend(user_id: str, friend_id: str) -> bool:
    """Removes bidirectional friendship between user_id and friend_id."""
    if db_engine and db_engine._db is not None:
        try:
            return await db_engine.remove_friend(user_id, friend_id)
        except Exception as e:
            logger.warning(f"Direct remove_friend failed: {e}; falling back to MCP.")
    try:
        await _run_mcp_tool("update-many", {
            "database": "fahem",
            "collection": "users",
            "filter": {"userId": user_id},
            "update": {"$pull": {"friends": friend_id}}
        })
        await _run_mcp_tool("update-many", {
            "database": "fahem",
            "collection": "users",
            "filter": {"userId": friend_id},
            "update": {"$pull": {"friends": user_id}}
        })
        logger.info(f"[MCP BI-FRIENDSHIP SEVERED] {user_id} <-> {friend_id}")
        return True
    except Exception as err:
        logger.warning(f"Failed to remove friend: {err}")
        return False

async def save_chat_message(sender_id: str, sender_name: str, recipient_id: str, content: str, is_group: bool) -> bool:
    """Persists direct or group chat messages."""
    if db_engine and db_engine._db is not None:
        try:
            return await db_engine.save_chat_message(sender_id, sender_name, recipient_id, content, is_group)
        except Exception as e:
            logger.warning(f"Direct save_chat_message failed: {e}; falling back to MCP.")
    try:
        from datetime import datetime
        doc = {
            "senderId": sender_id,
            "senderName": sender_name,
            "recipientId": recipient_id,
            "content": content,
            "isGroup": is_group,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        await _run_mcp_tool("insert-many", {
            "database": "fahem",
            "collection": "messages",
            "documents": [doc]
        })
        logger.info(f"[MCP MSG SENT] {sender_name} -> {recipient_id} (Group: {is_group})")
        return True
    except Exception as err:
        logger.warning(f"Failed to save chat message: {err}")
        return False

async def get_chat_history(sender_id: str, recipient_id: str, is_group: bool) -> list:
    """Fetches message history between two users or within a group."""
    if db_engine and db_engine._db is not None:
        try:
            messages = await db_engine.get_chat_history(sender_id, recipient_id, is_group)
            return [m.model_dump(by_alias=True) for m in messages]
        except Exception as e:
            logger.warning(f"Direct get_chat_history failed: {e}; falling back to MCP.")
    try:
        if is_group:
            filt = {"recipientId": recipient_id, "isGroup": True}
        else:
            filt = {
                "isGroup": False,
                "$or": [
                    {"senderId": sender_id, "recipientId": recipient_id},
                    {"senderId": recipient_id, "recipientId": sender_id}
                ]
            }
            
        res = await _run_mcp_tool("find", {
            "database": "fahem",
            "collection": "messages",
            "filter": filt,
            "options": {
                "sort": {"timestamp": 1},
                "limit": 200
            }
        })
        docs = []
        if isinstance(res, list):
            docs = res
        elif isinstance(res, dict) and "documents" in res:
            docs = res["documents"]
        elif isinstance(res, dict) and "result" in res:
            docs = res["result"]
        return docs
    except Exception as err:
        logger.warning(f"Failed to fetch chat history: {err}")
        return []

async def get_pending_children(parent_email: str) -> list:
    """Fetches underage students associated with parent_email."""
    if db_engine and db_engine._db is not None:
        try:
            children = await db_engine.get_pending_children(parent_email)
            return [c.model_dump(by_alias=True) for c in children]
        except Exception as e:
            logger.warning(f"Direct get_pending_children failed: {e}; falling back to MCP.")
    try:
        res = await _run_mcp_tool("find", {
            "database": "fahem",
            "collection": "users",
            "filter": {"parentEmail": parent_email.strip().lower()}
        })
        docs = []
        if isinstance(res, list):
            docs = res
        elif isinstance(res, dict) and "documents" in res:
            docs = res["documents"]
        elif isinstance(res, dict) and "result" in res:
            docs = res["result"]
        return docs
    except Exception as err:
        logger.warning(f"Failed to get pending children: {err}")
        return []

async def approve_child(parent_email: str, child_id: str) -> bool:
    """Approves a child profile pending review."""
    if db_engine and db_engine._db is not None:
        try:
            return await db_engine.approve_child(parent_email, child_id)
        except Exception as e:
            logger.warning(f"Direct approve_child failed: {e}; falling back to MCP.")
    try:
        await _run_mcp_tool("update-many", {
            "database": "fahem",
            "collection": "users",
            "filter": {"userId": child_id, "parentEmail": parent_email.strip().lower()},
            "update": {"$set": {"isApproved": True}}
        })
        logger.info(f"[MCP CHILD APPROVED] Parent: {parent_email} -> Child: {child_id}")
        return True
    except Exception as err:
        logger.warning(f"Failed to approve child: {err}")
        return False

if __name__ == "__main__":
    # Load env variables relative to agents path if needed
    try:
        agents_dir = os.path.dirname(os.path.abspath(__file__))
        possible_paths = [
            os.path.join(agents_dir, ".env.local"),
            os.path.join(os.path.dirname(agents_dir), ".env.local"),
            os.path.join(os.path.dirname(agents_dir), "web", ".env.local")
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

    try:
        meta = asyncio.run(database_telemetry_engine())
    except Exception as e:
        meta = {
            "databaseName": "fahem",
            "collectionsCount": "...",
            "collectionList": "...",
            "storageSize": "...",
            "indexCount": "...",
            "status": f"Disconnected (Error: {str(e)})"
        }
    print(json.dumps(meta))
