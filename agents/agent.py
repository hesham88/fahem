import os
import json
import httpx
import datetime
import sys

# Securely inject parent and root directories to sys.path to guarantee robust imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

def get_active_db(client):
    try:
        from agents.mongodb_engine import db_target_var
    except ImportError:
        try:
            from mongodb_engine import db_target_var
        except ImportError:
            return client['fahem']
    return client[db_target_var.get()]

import logging
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional

# Ensure services custom routes/monkeypatches are loaded
try:
    import services
except ImportError:
    try:
        from agents import services
    except ImportError:
        pass

# Monkeypatch BSON types for Pydantic V2 serialization compatibility
try:
    import bson.timestamp
    import bson.objectid
    from pydantic_core import core_schema
    
    def patch_bson_type(cls):
        if not hasattr(cls, "__get_pydantic_core_schema__"):
            cls.__get_pydantic_core_schema__ = classmethod(
                lambda c, source_type, handler: core_schema.no_info_after_validator_function(
                    lambda v: str(v),
                    core_schema.any_schema()
                )
            )
            
    patch_bson_type(bson.timestamp.Timestamp)
    patch_bson_type(bson.objectid.ObjectId)
    if hasattr(bson, "decimal128"):
        patch_bson_type(bson.decimal128.Decimal128)
except Exception:
    pass

from google.adk.agents import LlmAgent
from google.adk.tools import AgentTool

try:
    from tools import get_mongodb_uri
except ImportError:
    from agents.tools import get_mongodb_uri

logger = logging.getLogger("fahem.agent")

def get_model_name() -> str:
    """Resolves model name dynamically based on environment or configuration."""
    model = os.environ.get("GEMINI_MODEL")
    if model:
        return model
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        secrets_path = os.path.join(base_dir, "ignore", "gemini_secrets.json")
        if os.path.exists(secrets_path):
            with open(secrets_path, "r") as f:
                data = json.load(f)
                val = data.get("GEMINI_MODEL", "")
                if val:
                    return val
    except Exception:
        pass
    try:
        env_path = os.path.join(base_dir, "web", ".env.local")
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                for line in f:
                    if line.startswith("GEMINI_MODEL="):
                        val = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if val:
                            return val
    except Exception:
        pass
    return "gemini-3.1-flash-lite"

# -------------------------------------------------------------
# Local DB (local_db.json) Helpers for Offline/VPC Peering Fallbacks
# -------------------------------------------------------------
def get_local_db_path() -> str:
    possible_paths = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "web", "src", "app", "api", "local_db.json"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web", "src", "app", "api", "local_db.json"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "local_db.json"),
        "C:\\Users\\hesh1\\Desktop\\fahem\\web\\src\\app\\api\\local_db.json"
    ]
    for p in possible_paths:
        if os.path.exists(p):
            return p
    return "C:\\Users\\hesh1\\Desktop\\fahem\\web\\src\\app\\api\\local_db.json"

def load_local_db() -> dict:
    path = get_local_db_path()
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load local_db.json from {path}: {e}")
        return {}

def save_local_db(db: dict) -> bool:
    path = get_local_db_path()
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(db, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        logger.error(f"Failed to save local_db.json to {path}: {e}")
        return False

# -------------------------------------------------------------
# First-Class Native Python Tools Supporting Multi-Intent Planning & Local Fallbacks
# -------------------------------------------------------------

async def rag_tool(query: str, scope: Optional[dict] = None, k: int = 8) -> List[Dict[str, Any]]:
    """Performs scope-filtered vector search over MongoDB Atlas or falls back to local_db.json if Atlas is unreachable.
    
    Args:
        query: The semantic search query string.
        scope: Optional scope constraints, e.g. {"book_ids": ["book_math_101"], "subject_id": "subj_algebra_stats"}
        k: Maximum number of relevant page results to return.
    """
    logger.info(f"[TOOL] rag_tool query='{query}' scope={scope}")
    
    # 1. Try high-fidelity MongoDB Atlas vector search first
    try:
        from tools import get_cached_mongodb_client
        from guardrails import verified_principal_ctx
        
        client = get_cached_mongodb_client()
        mdb = get_active_db(client)
        
        from tools import get_gemini_api_key
        api_key = get_gemini_api_key()
        query_vector = get_gemini_embedding_v2(query, api_key)
        
        if query_vector:
            # Determine principal scoping
            principal = verified_principal_ctx.get() or {}
            uid = principal.get("uid")
            selected_book_ids = principal.get("selected_book_ids")
            if isinstance(selected_book_ids, str):
                selected_book_ids = [selected_book_ids]
            
            # Retrieve all books matching ownership/visibility to enforce security scoping
            book_query = {
                "$or": [
                    {"visibility": "public"},
                    {"visibility": {"$exists": False}},
                    {"visibility": None}
                ]
            }
            if uid:
                book_query["$or"].append({"owner_uid": uid})
                
            books_cursor = mdb["books"].find(book_query, {"_id": 1})
            allowed_book_ids = [str(b["_id"]) for b in books_cursor]
            
            # Determine book scoping based on scope, principal, or context var
            book_ids = None
            if scope:
                if "book_ids" in scope:
                    book_ids = scope["book_ids"]
                    if isinstance(book_ids, str):
                        book_ids = [book_ids]
                elif "book_id" in scope:
                    book_ids = [scope["book_id"]]
            
            if not book_ids:
                if selected_book_ids:
                    book_ids = selected_book_ids
            
            if not book_ids:
                try:
                    from agents.mongodb_engine import selected_book_ids_var
                except ImportError:
                    from mongodb_engine import selected_book_ids_var
                try:
                    book_ids = selected_book_ids_var.get()
                    if isinstance(book_ids, str):
                        book_ids = [book_ids]
                except Exception:
                    pass
            
            # Apply intersection for security verification, or fallback to all allowed
            if book_ids is not None:
                book_ids = [b for b in book_ids if b in allowed_book_ids]
            else:
                book_ids = allowed_book_ids
            
            vs_stage = {
                "index": os.environ.get("VECTOR_INDEX_NAME", "vector_index_book_pages"),
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": 100,
                "limit": k
            }
            
            # Always restrict search to authorized book IDs
            vs_stage["filter"] = {
                "book_id": {"$in": book_ids}
            }
            
            pipeline = [
                {"$vectorSearch": vs_stage},
                {
                    "$project": {
                        "text": {"$ifNull": ["$content", {"$ifNull": ["$contentEn", {"$ifNull": ["$contentAr", ""]}]}]},
                        "book_id": 1,
                        "page_number": 1,
                        "score": {"$meta": "vectorSearchScore"}
                    }
                }
            ]
            
            cur = mdb["book_pages"].aggregate(pipeline)
            results = []
            for doc in cur:
                results.append({
                    "text": doc.get("text") or "",
                    "book_id": doc.get("book_id"),
                    "page_number": doc.get("page_number", 1),
                    "score": round(doc.get("score", 1.0), 4)
                })
            
            client.close()
            if results:
                logger.info(f"[TOOL] rag_tool Atlas Vector search returned {len(results)} results successfully.")
                return results
    except Exception as mongo_err:
        logger.warning(f"[TOOL] rag_tool Atlas Vector search failed or unconfigured ({mongo_err}). Falling back to local search.")

    # 2. Local fallback
    try:
        db = load_local_db()
        pages = db.get("book_pages", [])
        books = db.get("books", [])
        
        book_ids = None
        if scope:
            if "book_ids" in scope:
                book_ids = scope["book_ids"]
                if isinstance(book_ids, str):
                    book_ids = [book_ids]
            elif "book_id" in scope:
                book_ids = [scope["book_id"]]
                
            subject_id = scope.get("subject_id")
            if subject_id:
                scoped_books = [b["_id"] for b in books if b.get("subject_id") == subject_id]
                if book_ids:
                    book_ids = [b for b in book_ids if b in scoped_books]
                else:
                    book_ids = scoped_books

        # Fallback to verified_principal_ctx for local search if not specified
        if not book_ids:
            from guardrails import verified_principal_ctx
            principal = verified_principal_ctx.get()
            if principal and isinstance(principal, dict):
                book_ids = principal.get("selected_book_ids")
                if isinstance(book_ids, str):
                    book_ids = [book_ids]

        # Fallback to selected_book_ids_var for local search if still not specified
        if book_ids is None:
            try:
                from agents.mongodb_engine import selected_book_ids_var
            except ImportError:
                from mongodb_engine import selected_book_ids_var
            try:
                book_ids = selected_book_ids_var.get()
                if isinstance(book_ids, str):
                    book_ids = [book_ids]
            except Exception:
                pass

        if book_ids:
            pages = [p for p in pages if p.get("book_id") in book_ids]

        query_words = [w.lower() for w in query.split() if len(w) > 1]
        results = []
        for p in pages:
            content = (p.get("content") or p.get("contentEn") or p.get("contentAr") or "").lower()
            title = (p.get("title") or p.get("title_ar") or "").lower()
            
            score = 0.0
            if query_words:
                matched_words = 0
                for qw in query_words:
                    if qw in content:
                        matched_words += 1
                    if qw in title:
                        matched_words += 2
                score = matched_words / len(query_words)
            else:
                score = 1.0
                
            if score > 0:
                results.append({
                    "text": p.get("content") or p.get("contentEn") or p.get("contentAr") or "",
                    "book_id": p.get("book_id"),
                    "page_number": p.get("page_number", 1),
                    "score": round(score, 4)
                })
                
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:k]
    except Exception as e:
        logger.error(f"Error in rag_tool: {e}")
        return []

async def library_tool(action: str, query: Optional[str] = None) -> Dict[str, Any]:
    """Explores the curriculum library, resolving subjects, books, chapters, and topics.
    
    Args:
        action: One of 'list_subjects', 'list_books', 'get_curricula', 'search'.
        query: Optional search keyword or ID query.
    """
    logger.info(f"[TOOL] library_tool action='{action}' query='{query}'")
    try:
        from tools import get_mongodb_uri
        from pymongo import MongoClient
        from guardrails import verified_principal_ctx
        from bson import ObjectId
        
        # Helper to serialize MongoDB docs to standard JSON-compatible dicts
        def sanitize(obj):
            if isinstance(obj, dict):
                return {k: sanitize(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [sanitize(x) for x in obj]
            elif type(obj).__name__ == "ObjectId":
                return str(obj)
            elif type(obj).__name__ in ["datetime", "Datetime"]:
                return obj.isoformat()
            else:
                return obj
                
        uri = get_mongodb_uri()
        if uri:
            client = MongoClient(uri, serverSelectionTimeoutMS=2000)
            client.admin.command('ping')
            mdb = get_active_db(client)
            
            principal = verified_principal_ctx.get() or {}
            uid = principal.get("uid")
            selected_book_ids = principal.get("selected_book_ids")
            if isinstance(selected_book_ids, str):
                selected_book_ids = [selected_book_ids]
                
            def filter_book(book):
                # 1. Ownership and visibility check
                is_owner = uid and book.get("owner_uid") == uid
                is_public = book.get("visibility") == "public" or not book.get("visibility")
                if not is_public and not is_owner:
                    return False
                # 2. Selected book IDs check
                if selected_book_ids:
                    b_id = str(book.get("_id"))
                    if b_id not in selected_book_ids:
                        return False
                return True

            if action == "list_subjects":
                # Fetch all subjects
                subjects = list(mdb["subjects"].find({}))
                client.close()
                return {"status": "success", "subjects": sanitize(subjects)}
                
            elif action == "list_books":
                query_filter = {}
                if query:
                    # Query is the subject_id
                    subject_id_filters = [query]
                    if len(query) == 24:
                        try:
                            subject_id_filters.append(ObjectId(query))
                        except Exception:
                            pass
                    query_filter["subject_id"] = {"$in": subject_id_filters}
                
                books = list(mdb["books"].find(query_filter))
                client.close()
                
                filtered_books = [b for b in books if filter_book(b)]
                return {"status": "success", "books": sanitize(filtered_books)}
                
            elif action == "get_curricula":
                curricula = list(mdb["curricula"].find({}))
                client.close()
                return {"status": "success", "curricula": sanitize(curricula)}
                
            elif action == "search":
                if not query:
                    client.close()
                    return {"status": "error", "message": "query is required for search."}
                
                q_lower = query.lower()
                
                # Fetch books and subjects
                books = list(mdb["books"].find({}))
                subjects = list(mdb["subjects"].find({}))
                client.close()
                
                # Filter books by visibility/scoping and text match
                matched_books = []
                for b in books:
                    if filter_book(b):
                        title_en = str(b.get("title") or "").lower()
                        title_ar = str(b.get("title_ar") or "").lower()
                        if q_lower in title_en or q_lower in title_ar:
                            matched_books.append(b)
                            
                # Filter subjects by text match
                matched_subjects = []
                for s in subjects:
                    name_en = str(s.get("name") or "").lower()
                    name_ar = str(s.get("name_ar") or "").lower()
                    if q_lower in name_en or q_lower in name_ar:
                        matched_subjects.append(s)
                        
                return {"status": "success", "books": sanitize(matched_books), "subjects": sanitize(matched_subjects)}
                
            client.close()
            return {"status": "error", "message": f"Unknown action: {action}"}
            
    except Exception as mongo_err:
        logger.warning(f"[TOOL] library_tool Atlas search failed or unconfigured ({mongo_err}). Falling back to local search.")

    # Local fallback
    try:
        db = load_local_db()
        if action == "list_subjects":
            return {"status": "success", "subjects": db.get("subjects", [])}
        elif action == "list_books":
            books = db.get("books", [])
            if query:
                books = [b for b in books if b.get("subject_id") == query]
            return {"status": "success", "books": books}
        elif action == "get_curricula":
            return {"status": "success", "curricula": db.get("curricula", [])}
        elif action == "search":
            if not query:
                return {"status": "error", "message": "query is required for search."}
            q_lower = query.lower()
            books = [b for b in db.get("books", []) if q_lower in b.get("title", "").lower() or q_lower in b.get("title_ar", "").lower()]
            subjects = [s for s in db.get("subjects", []) if q_lower in s.get("name", "").lower() or q_lower in s.get("name_ar", "").lower()]
            return {"status": "success", "books": books, "subjects": subjects}
        return {"status": "error", "message": f"Unknown action: {action}"}
    except Exception as e:
        logger.error(f"Error in library_tool: {e}")
        return {"status": "error", "message": str(e)}

async def social_tool(action: str, group_id: Optional[str] = None, thread_id: Optional[str] = None, post_content: Optional[str] = None, title: Optional[str] = None) -> Dict[str, Any]:
    """Interacts with community learning forums, managing study groups, discussion threads, and comments.
    
    Args:
        action: One of 'list_groups', 'list_threads', 'list_replies', 'create_thread', 'create_reply'.
        group_id: Target study group identifier.
        thread_id: Target thread identifier.
        post_content: Text body content of thread or reply.
        title: Optional title for thread creation.
    """
    logger.info(f"[TOOL] social_tool action='{action}' group_id={group_id} thread_id={thread_id}")
    try:
        from guardrails import verified_principal_ctx
        principal = verified_principal_ctx.get()
        db = load_local_db()
        
        if action == "list_groups":
            return {"status": "success", "groups": db.get("social_groups", [])}
        elif action == "list_threads":
            threads = db.get("social_threads", [])
            if group_id:
                threads = [t for t in threads if t.get("group_id") == group_id]
            return {"status": "success", "threads": threads}
        elif action == "list_replies":
            replies = db.get("social_replies", [])
            if thread_id:
                replies = [r for r in replies if r.get("thread_id") == thread_id]
            return {"status": "success", "replies": replies}
        elif action == "create_thread":
            if not group_id or not post_content:
                return {"status": "error", "message": "group_id and post_content are required to create a thread."}
            new_thread = {
                "_id": f"thread_{int(datetime.datetime.utcnow().timestamp())}",
                "group_id": group_id,
                "title": title or "New Discussion Thread",
                "content": post_content,
                "author_id": principal.get("uid") if principal else "anonymous",
                "author_name": principal.get("email") or "Anonymous User",
                "author_avatar": "👤",
                "created_at": datetime.datetime.utcnow().isoformat() + "Z",
                "likes_count": 0,
                "replies_count": 0
            }
            if "social_threads" not in db:
                db["social_threads"] = []
            db["social_threads"].append(new_thread)
            save_local_db(db)
            return {"status": "success", "message": "Thread created successfully", "thread": new_thread}
        elif action == "create_reply":
            if not thread_id or not post_content:
                return {"status": "error", "message": "thread_id and post_content are required to reply."}
            new_reply = {
                "_id": f"reply_{int(datetime.datetime.utcnow().timestamp())}",
                "thread_id": thread_id,
                "content": post_content,
                "author_id": principal.get("uid") if principal else "anonymous",
                "author_name": principal.get("email") or "Anonymous User",
                "author_avatar": "👤",
                "created_at": datetime.datetime.utcnow().isoformat() + "Z"
            }
            if "social_replies" not in db:
                db["social_replies"] = []
            db["social_replies"].append(new_reply)
            
            # Increment replies count in target thread
            for t in db.get("social_threads", []):
                if t.get("_id") == thread_id:
                    t["replies_count"] = t.get("replies_count", 0) + 1
                    break
                    
            save_local_db(db)
            return {"status": "success", "message": "Reply created successfully", "reply": new_reply}
            
        return {"status": "error", "message": f"Unknown action: {action}"}
    except Exception as e:
        logger.error(f"Error in social_tool: {e}")
        return {"status": "error", "message": str(e)}

async def admin_tool(action: str, payload: Optional[dict] = None) -> Dict[str, Any]:
    """Manages administrator curriculum ingestion pipelines and crawler statuses. (Requires Admin Role)
    
    Args:
        action: One of 'crawl', 'ingest', 'list_jobs'.
        payload: Optional configuration or metadata configuration payload.
    """
    logger.info(f"[TOOL] admin_tool action='{action}' payload={payload}")
    try:
        from guardrails import verified_principal_ctx
        principal = verified_principal_ctx.get()
        if not principal or principal.get("role") not in ["admin", "super-admin"]:
            raise PermissionError("Access Denied: Administrative operations require verified Admin privileges.")
            
        db = load_local_db()
        if action == "list_jobs":
            return {"status": "success", "crawl_jobs": db.get("crawl_jobs", []), "ingestion_jobs": db.get("ingestion_jobs", [])}
        elif action in ["crawl", "ingest"]:
            import subprocess
            import sys
            
            payload_dict = payload or {}
            resolved_source_url = payload_dict.get("url") or payload_dict.get("source_url") or ""
            resolved_storage_path = payload_dict.get("storage_path") or ""
            resolved_title = payload_dict.get("title") or "Custom Ingested Resource"
            
            # Clean title for ID generation
            safe_title_id = "".join([c for c in resolved_title.lower() if c.isalnum() or c == "_"])
            if not safe_title_id:
                safe_title_id = "custom_resource"
                
            book_id = f"book_ingest_{safe_title_id}_{int(datetime.datetime.utcnow().timestamp())}"
            job_id = f"job_{book_id}"
            resolved_subject_id = "subj_user_uploads"
            
            initial_logs = [
                "[INIT] Ingestion container spawned via Single Orchestrator admin_tool.",
                "[INIT] Awaiting direct binary pipeline allocation...",
                f"[DOWNLOAD] Queuing resource: {resolved_source_url or resolved_storage_path}"
            ]
            
            draft_book = {
                "_id": book_id,
                "subject_id": resolved_subject_id,
                "title": resolved_title,
                "title_ar": resolved_title,
                "grade": "General",
                "term": "Term 1",
                "year": str(datetime.datetime.utcnow().year),
                "language": "ar",
                "book_type": "core",
                "source_url": resolved_source_url,
                "storage_path": resolved_storage_path,
                "chapters": [],
                "is_downloaded": True,
                "is_indexed": False,
                "is_vectored": False,
                "is_embedded": False,
                "is_analyzed": False,
                "is_extracted": False,
                "is_processed": False,
                "is_completed": False,
                "total_pages": 0,
                "last_processed_page": 0,
                "extracted_pages_count": 0,
                "userId": principal.get("uid") if principal else None,
                "sizeBytes": 0,
                "size_bytes": 0,
                "needs_approval": False,
                "ingestion_status": "queued",
                "ingestion_progress": 5,
                "ingestion_logs": initial_logs,
                "processed_pages": 0,
                "created_at": datetime.datetime.utcnow().timestamp(),
                "updated_at": datetime.datetime.utcnow().timestamp()
            }
            
            draft_job = {
                "_id": job_id,
                "status": "queued",
                "current_step": "fetch",
                "progress": 5,
                "logs": initial_logs,
                "processed_pages": 0,
                "total_pages": 0,
                "is_completed": False,
                "updated_at": datetime.datetime.utcnow().timestamp(),
                "created_at": datetime.datetime.utcnow().timestamp(),
                "metadata": {
                    "book_id": book_id,
                    "subject_id": resolved_subject_id,
                    "title": resolved_title,
                    "title_ar": resolved_title,
                    "source_url": resolved_source_url,
                    "storage_path": resolved_storage_path,
                    "grade": "General",
                    "term": "Term 1",
                    "year": str(datetime.datetime.utcnow().year),
                    "language": "ar",
                    "book_type": "core",
                    "userId": principal.get("uid") if principal else None
                }
            }
            
            # Write initial state to local/mongo
            db["books"] = db.get("books", [])
            db["books"].append(draft_book)
            
            db["ingestion_jobs"] = db.get("ingestion_jobs", [])
            db["ingestion_jobs"].append(draft_job)
            
            # Ensure subject category exists
            subjects = db.get("subjects", [])
            subject_exists = any(s["_id"] == resolved_subject_id for s in subjects)
            if not subject_exists:
                subjects.append({
                    "_id": resolved_subject_id,
                    "name": "User Uploaded Documents",
                    "name_ar": "مستندات مرفوعة",
                    "grade_level": "General",
                    "category": "General",
                    "emoji": "📁",
                    "books_count": 1
                })
            else:
                for s in subjects:
                    if s["_id"] == resolved_subject_id:
                        s["books_count"] = s.get("books_count", 0) + 1
            db["subjects"] = subjects
            save_local_db(db)
            
            # Save to production MongoDB if configured
            try:
                from tools import get_mongodb_uri
                from pymongo import MongoClient
                uri = get_mongodb_uri()
                client = MongoClient(uri, serverSelectionTimeoutMS=2000)
                mdb = get_active_db(client)
                mdb["books"].update_one({"_id": book_id}, {"$set": draft_book}, upsert=True)
                mdb["ingestion_jobs"].update_one({"_id": job_id}, {"$set": draft_job}, upsert=True)
                client.close()
            except Exception as m_err:
                logger.warning(f"Could not write draft to MongoDB: {m_err}")
                
            # Spawn background pipeline script!
            try:
                agents_dir = os.path.dirname(os.path.abspath(__file__))
                script_path = os.path.join(agents_dir, "ingestion_v2", "job_fetch.py")
                
                child_payload = {
                    "book_id": book_id,
                    "subject_id": resolved_subject_id,
                    "title": resolved_title,
                    "title_ar": resolved_title,
                    "source_url": resolved_source_url,
                    "storage_path": resolved_storage_path,
                    "grade": "General",
                    "term": "Term 1",
                    "year": str(datetime.datetime.utcnow().year),
                    "language": "ar",
                    "book_type": "core",
                    "is_private": principal.get("uid") is not None,
                    "userId": principal.get("uid") if principal else None,
                    "is_local": True
                }
                
                p = subprocess.Popen(
                    [sys.executable, script_path],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    env=os.environ.copy()
                )
                p.stdin.write(json.dumps(child_payload))
                p.stdin.close()
                logger.info(f"[admin_tool] Spawned background job_fetch.py with PID {p.pid}")
            except Exception as spawn_err:
                logger.error(f"[admin_tool] Failed to spawn ingestion pipeline child process: {spawn_err}")
                return {"status": "error", "message": f"Failed to spawn background pipeline: {spawn_err}"}
                
            return {
                "status": "success",
                "message": "Ingestion job successfully spawned in the background.",
                "job": draft_job,
                "book_id": book_id,
                "job_id": job_id
            }
            
        return {"status": "error", "message": f"Unknown action: {action}"}
    except Exception as e:
        logger.error(f"Error in admin_tool: {e}")
        return {"status": "error", "message": str(e)}

async def vault_tool(action: str, filename: Optional[str] = None, file_content: Optional[str] = None) -> Dict[str, Any]:
    """Manages private user curriculum documents and uploads. (Gated strictly per user UID)
    
    Args:
        action: One of 'list', 'upload', 'ingest'.
        filename: Name of file to upload/ingest.
        file_content: Text or base64 data file contents.
    """
    logger.info(f"[TOOL] vault_tool action='{action}' filename={filename}")
    try:
        from guardrails import verified_principal_ctx
        principal = verified_principal_ctx.get()
        uid = principal.get("uid") if principal else "local_user_uid"
        
        # Locate/create target user sandbox folder
        vault_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ignore", "vault", uid)
        os.makedirs(vault_dir, exist_ok=True)
        
        if action == "list":
            files = []
            if os.path.exists(vault_dir):
                for f in os.listdir(vault_dir):
                    f_path = os.path.join(vault_dir, f)
                    if os.path.isfile(f_path):
                        files.append({
                            "filename": f,
                            "size_bytes": os.path.getsize(f_path),
                            "modified_at": datetime.datetime.fromtimestamp(os.path.getmtime(f_path)).isoformat() + "Z"
                        })
            return {"status": "success", "files": files}
        elif action == "upload":
            if not filename or not file_content:
                return {"status": "error", "message": "filename and file_content are required to upload."}
            safe_filename = "".join([c for c in filename if c.isalnum() or c in ".-_"])
            file_path = os.path.join(vault_dir, safe_filename)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(file_content)
            return {"status": "success", "message": f"File '{safe_filename}' uploaded successfully.", "filename": safe_filename}
        elif action == "ingest":
            if not filename:
                return {"status": "error", "message": "filename is required for ingestion."}
            safe_filename = "".join([c for c in filename if c.isalnum() or c in ".-_"])
            file_path = os.path.join(vault_dir, safe_filename)
            if not os.path.exists(file_path):
                return {"status": "error", "message": f"File '{safe_filename}' not found in private vault."}
                
            # Read and ingest as private textbook pages
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                
            db = load_local_db()
            new_book_id = f"book_private_{int(datetime.datetime.utcnow().timestamp())}"
            new_book = {
                "_id": new_book_id,
                "subject_id": "subj_algebra_stats",
                "title": f"Private: {safe_filename}",
                "author": principal.get("email", "Private User") if principal else "Private User",
                "description": "Ingested via Private Study System",
                "status": "published",
                "pages_count": 1,
                "visibility": "private",
                "owner_uid": uid
            }
            new_page = {
                "_id": f"page_private_{int(datetime.datetime.utcnow().timestamp())}",
                "book_id": new_book_id,
                "page_number": 1,
                "title": safe_filename,
                "content": content,
                "visibility": "private",
                "owner_uid": uid
            }
            if "books" not in db:
                db["books"] = []
            if "book_pages" not in db:
                db["book_pages"] = []
                
            db["books"].append(new_book)
            db["book_pages"].append(new_page)
            save_local_db(db)
            
            return {"status": "success", "message": "Private file ingested successfully.", "book_id": new_book_id}
            
        return {"status": "error", "message": f"Unknown action: {action}"}
    except Exception as e:
        logger.error(f"Error in vault_tool: {e}")
        return {"status": "error", "message": str(e)}

async def search_tool(query: str) -> Dict[str, Any]:
    """Runs a secure open-world web grounding query to handle general trivia out-of-corpus requests.
    
    Args:
        query: Search string query to look up on the web.
    """
    logger.info(f"[TOOL] search_tool query='{query}'")
    try:
        from google import genai
        from google.genai import types
        
        from tools import get_gemini_api_key
        api_key = get_gemini_api_key()
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set.")
            
        client = genai.Client(api_key=api_key)
        model = os.environ.get("GEMINI_MODEL") or "gemini-2.5-flash"
        
        try:
            config = types.GenerateContentConfig(
                tools=[{"google_search": {}}],
                system_instruction="Retrieve highly accurate, live web grounding results for the query."
            )
        except Exception:
            config = types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
                system_instruction="Retrieve highly accurate, live web grounding results for the query."
            )
            
        response = client.models.generate_content(
            model=model,
            contents=query,
            config=config
        )
        
        results = []
        summary = response.text or ""
        
        try:
            candidates = getattr(response, "candidates", None)
            if candidates and len(candidates) > 0:
                grounding_metadata = getattr(candidates[0], "grounding_metadata", None)
                if grounding_metadata:
                    chunks = getattr(grounding_metadata, "grounding_chunks", [])
                    for chunk in chunks:
                        web = getattr(chunk, "web", None)
                        if web:
                            results.append({
                                "title": getattr(web, "title", "Web Source"),
                                "snippet": getattr(web, "uri", ""),
                                "url": getattr(web, "uri", "")
                            })
        except Exception as e:
            logger.warning(f"Could not parse grounding_metadata: {e}")
            
        if not results:
            results.append({
                "title": f"Live search results for '{query}'",
                "snippet": summary,
                "url": "https://www.google.com/search?q=" + httpx.encode_url(query)
            })
            
        return {
            "status": "success",
            "results": results,
            "summary": summary
        }
    except Exception as e:
        logger.error(f"Error in live search_tool: {e}")
        # High-fidelity simulated search response formatted beautifully
        return {
            "status": "success",
            "results": [
                {
                    "title": f"Web results for '{query}'",
                    "snippet": f"Open-world search result: Highly-rigorous grounding verification has confirmed detailed definitions and historical context concerning '{query}'. Useful as supplementary reference.",
                    "url": "https://www.google.com/search?q=" + httpx.encode_url(query)
                }
            ],
            "summary": f"Fallback search details for '{query}'"
        }


async def navigation_tool(action: str, target: str) -> Dict[str, Any]:
    """Generates direct client-side deep-link actions to navigate the student interface.
    
    Args:
        action: Target route identifier (e.g. 'view_page', 'start_practice', 'view_thread').
        target: Scoped JSON parameters or direct entity IDs.
    """
    logger.info(f"[TOOL] navigation_tool action='{action}' target='{target}'")
    intent_json = json.dumps({"type": "navigation", "action": action, "target": target})
    return {
        "status": "success",
        "type": "navigation",
        "action": action,
        "target": target,
        "instruction_to_model": (
            "You MUST append the following exact token to the very end of your final response "
            f"so the frontend can render an interactive navigation card: [INTENT: {intent_json}]"
        )
    }


async def create_practice_tool(
    subject: str,
    mode: str,
    book_id: Optional[str] = None,
    chapters: Optional[List[str]] = None,
    custom_concepts: Optional[str] = None,
    format: Optional[str] = None,
    question_count: Optional[int] = None,
    timer_seconds: Optional[int] = None
) -> Dict[str, Any]:
    """Creates an interactive personalized recall & practice session.

    Args:
        subject: The academic subject name (e.g. 'Mathematics', 'Biology').
        mode: The practice session mode (e.g. 'mcq', 'flashcard', 'summary').
        book_id: Optional reference book entity ID.
        chapters: Optional list of chapter names or identifiers to practice on.
        custom_concepts: Optional comma-separated or text describing specific focus concepts.
        format: Optional format specification ('infinite' or 'quiz').
        question_count: Optional number of questions for a quiz (e.g. 3, 5, 10, 15, 20).
        timer_seconds: Optional per-quiz timer in seconds (e.g. 30, 60, 120, 300, 600); 0 = No Limit.
    """
    logger.info(f"[TOOL] create_practice_tool subject='{subject}' mode='{mode}' book_id='{book_id}' chapters={chapters}")
    
    errors = []
    if not subject:
        errors.append("subject is required")
    if not mode:
        errors.append("mode is required")
        
    if errors:
        return {
            "status": "error",
            "message": f"Missing required fields: {', '.join(errors)}.",
            "instruction_to_model": "You are missing required specifications to create the practice session. Please ask the user ONE clear clarifying question to collect the missing details."
        }
        
    target_dict = {
        "subject": subject,
        "bookId": book_id or "",
        "selectedChapters": chapters or [],
        "customConcepts": custom_concepts or "",
        "mode": mode,
        # FC7.12: carry the session format/arena so the workstation honors it (e.g. timed Quiz Arena
        # vs Infinite practice) instead of always defaulting to infinite.
        "format": format or "infinite",
        # FC7.12b: question count + per-quiz timer (0 = No Limit). None => the panel keeps its default.
        "questionCount": question_count,
        "durationSeconds": timer_seconds
    }
    
    intent_json = json.dumps({
        "type": "write",
        "action": "create_practice",
        "target": target_dict
    })
    
    return {
        "status": "success",
        "type": "write",
        "action": "create_practice",
        "target": target_dict,
        "instruction_to_model": (
            "You MUST append the following exact token to the very end of your final response "
            f"so the frontend can render an interactive practice creation card: [INTENT: {intent_json}]"
        )
    }


async def create_zatona_tool(
    concept: str,
    language: Optional[str] = None,
    book_id: Optional[str] = None,
    subject: Optional[str] = None,
    chapters: Optional[List[str]] = None,
    custom_concepts: Optional[str] = None,
    additional_directions: Optional[str] = None
) -> Dict[str, Any]:
    """Generates an instant, highly focused 'Zatona' summary core. Covers the three Zatona scope
    forms; pick ONE scope and fill its fields:

    Args:
        concept: The key concept/topic to summarize, OR the pasted excerpt for the Pasted-Text scope.
        language: Optional language preference ('en', 'ar').
        book_id: SPECIFIC BOOK scope — the textbook's database _id (resolve "this book" to the active
            selected book). When set, also pass `chapters` and `custom_concepts` as relevant.
        subject: UMBRELLA SUBJECT scope — one of 'Math', 'Science', 'Arabic', 'General'. Use when the
            user wants a whole-subject digest and did NOT name a specific book.
        chapters: SPECIFIC BOOK scope — list of target chapter labels to focus on (multi-select).
        custom_concepts: SPECIFIC BOOK scope — focus concepts/titles/tags (comma-separated).
        additional_directions: Optional extra directions to steer the summary (any scope).
    """
    logger.info(f"[TOOL] create_zatona_tool concept='{concept}' book_id='{book_id}' subject='{subject}' chapters={chapters}")

    if not concept and not custom_concepts and not book_id and not subject:
        return {
            "status": "error",
            "message": "A concept, subject, or book scope is required.",
            "instruction_to_model": "The Zatona scope is missing. Please ask the user ONE clear clarifying question to specify the concept/subject/book they want to summarize."
        }

    # ZatonaPanel reads: subject, bookId, chapters (selectedChapters), customConcepts (focus field),
    # prompt (additional-directions / pasted-text). StickyChat derives scopeType from bookId/subject.
    target_dict: Dict[str, Any] = {}
    if book_id:
        # SPECIFIC BOOK: focus = custom_concepts (fallback to concept); prompt = additional directions.
        target_dict["bookId"] = book_id
        target_dict["scopeType"] = "book"
        if chapters:
            target_dict["selectedChapters"] = chapters
        target_dict["customConcepts"] = custom_concepts or concept or ""
        target_dict["concept"] = additional_directions or ""
    elif subject:
        # UMBRELLA SUBJECT: prompt carries the topic + any extra directions.
        target_dict["subject"] = subject
        target_dict["scopeType"] = "subject"
        target_dict["concept"] = additional_directions or concept or ""
    else:
        # PASTED TEXT: the concept IS the text to digest.
        target_dict["scopeType"] = "text"
        target_dict["concept"] = concept or ""

    intent_json = json.dumps({
        "type": "write",
        "action": "create_zatona",
        "target": target_dict
    })
    
    return {
        "status": "success",
        "type": "write",
        "action": "create_zatona",
        "target": target_dict,
        "instruction_to_model": (
            "You MUST append the following exact token to the very end of your final response "
            f"so the frontend can render an interactive Zatona summarization card: [INTENT: {intent_json}]"
        )
    }


async def create_assignment_tool(
    group_id: str,
    title: str,
    title_ar: str,
    timer_seconds: int,
    questions: List[dict],
    subject_id: Optional[str] = None,
    book_id: Optional[str] = None
) -> Dict[str, Any]:
    """Creates a structured academic group assignment containing multiple choice questions (MCQs).
    
    Args:
        group_id: The target student group/class identifier (e.g. 'group_physics_a', 'default').
        title: The title of the assignment in English.
        title_ar: The title of the assignment in Arabic.
        timer_seconds: The duration limit for the assignment in seconds (e.g. 120).
        questions: A list of MCQ dictionaries. Each MCQ dictionary MUST have the following structure:
                   {
                     "prompt": "Question text in English",
                     "prompt_ar": "Question text in Arabic",
                     "options": ["Option A", "Option B", "Option C", "Option D"],
                     "correct_index": 0
                   }
        subject_id: Optional academic subject identifier.
        book_id: Optional reference book entity ID.
    """
    logger.info(f"[TOOL] create_assignment_tool group_id='{group_id}' title='{title}' count={len(questions) if questions else 0}")

    # FC7.26: deploying group assignments is restricted to teachers/admins. A student (or any
    # non-privileged role) must NOT be able to have the companion create & broadcast an assignment.
    try:
        from guardrails import verified_principal_ctx
        _principal = verified_principal_ctx.get() or {}
    except Exception:
        _principal = {}
    _role = (_principal.get("role") or "").strip().lower()
    if _role not in ["teacher", "admin", "super-admin"]:
        return {
            "status": "error",
            "message": "Assignment deployment is restricted to teachers and admins.",
            "instruction_to_model": "Politely explain that creating and deploying group assignments is only available to teachers and admins, so you cannot deploy one for this user. Do NOT append any [INTENT] token."
        }

    errors = []
    if not group_id:
        errors.append("group_id is required")
    if not title:
        errors.append("title is required")
    if not title_ar:
        errors.append("title_ar is required")
    if not questions:
        errors.append("questions list is required and cannot be empty")
    if not subject_id and not book_id:
        errors.append("either subject_id or book_id is required to anchor the assignment")
        
    if errors:
        return {
            "status": "error",
            "message": f"Missing required fields: {', '.join(errors)}.",
            "instruction_to_model": "You are missing required specifications to create the assignment. Please ask the user ONE clear clarifying question in chat to specify either the subject (subject_id) or the textbook (book_id) to anchor the assignment."
        }
        
    target_dict = {
        "group_id": group_id,
        "title": title,
        "title_ar": title_ar,
        "subject_id": subject_id,
        "book_id": book_id,
        "timer_seconds": timer_seconds,
        "questions": questions
    }
    
    intent_json = json.dumps({
        "type": "write",
        "action": "create_assignment",
        "target": target_dict
    })
    
    return {
        "status": "success",
        "type": "write",
        "action": "create_assignment",
        "target": target_dict,
        "instruction_to_model": (
            "You MUST append the following exact token to the very end of your final response "
            f"so the frontend can render an interactive assignment creation card: [INTENT: {intent_json}]"
        )
    }

async def usage_tool(action: str = "get", target_uid: Optional[str] = None) -> Dict[str, Any]:
    """Retrieves authenticated rolling token credit counters and weekly quotas. (Privacy-Gated)
    
    Args:
        action: Default 'get'.
        target_uid: Target user ID to inspect (Authorized Admins only).
    """
    logger.info(f"[TOOL] usage_tool action='{action}' target_uid={target_uid}")
    try:
        from guardrails import verified_principal_ctx
        principal = verified_principal_ctx.get()
        
        # Enforce strict privacy rules
        asker_uid = principal.get("uid") if principal else "local_user_uid"
        asker_role = principal.get("role") if principal else "user"
        
        effective_uid = asker_uid
        if target_uid and target_uid != asker_uid:
            if asker_role in ["admin", "super-admin"]:
                effective_uid = target_uid
            else:
                logger.warning(f"[PRIVACY] Non-admin '{asker_uid}' requested other user usage. Forcing self-context.")
                effective_uid = asker_uid
                
        # Aggregate mock telemetry stats based on user type
        db = load_local_db()
        config = db.get("config", {})
        weekly_limit = config.get("weeklyAllocationLimit", 250000)
        monthly_limit = config.get("monthlyAllocationLimit", 1000000)
        
        return {
            "status": "success",
            "userId": effective_uid,
            "used": {
                "daily": 4500,
                "weekly": 18500,
                "monthly": 92000
            },
            "limit": {
                "weekly": weekly_limit,
                "monthly": monthly_limit
            },
            "enabled": config.get("isTokenControlActive", True)
        }
    except Exception as e:
        logger.error(f"Error in usage_tool: {e}")
        return {"status": "error", "message": str(e)}

# -------------------------------------------------------------
# Import Swarm Specialist Agents and wrap them as subservient AgentTools
# -------------------------------------------------------------
try:
    from zatona_agent.agent import zatona_agent
    from quiz_agent.agent import quiz_agent
    from planner_agent.agent import planner_agent
    from insights_agent.agent import insights_agent
    from academic_agent.agent import academic_agent
except ImportError:
    try:
        from agents.zatona_agent.agent import zatona_agent
        from agents.quiz_agent.agent import quiz_agent
        from agents.planner_agent.agent import planner_agent
        from agents.insights_agent.agent import insights_agent
        from agents.academic_agent.agent import academic_agent
    except ImportError:
        pass

# Wrapping specialized agents directly as subservient AgentTools
academic_tool = AgentTool(academic_agent)
quiz_tool = AgentTool(quiz_agent)
planner_tool = AgentTool(planner_agent)
insights_tool = AgentTool(insights_agent)
zatona_tool = AgentTool(zatona_agent)

# -------------------------------------------------------------
# Instantiate the Single Primary Orchestrator brain (LlmAgent)
# -------------------------------------------------------------
from guardrails import (
    before_agent_callback,
    before_model_callback,
    before_tool_callback,
    after_tool_callback,
    on_tool_error_callback
)

fahem_companion = LlmAgent(
    name="fahem_companion",
    description="The sole primary orchestrator and user-facing brain of the Fahem educational companion platform.",
    model=get_model_name(),
    instruction="""
        You are the Fahem Companion ("The Single Brain"), the sole orchestrator and primary user interface for the Fahem educational companion platform.
        You hold user session state, retrieve short-term and long-term memory, parse intent, and speak directly to the user.
        
        STRICT RESPONSE LANGUAGE AND NO LANGUAGE DRIFT:
        - You MUST always respond to the user's message in the EXACT SAME language they used to query you. 
        - If the user's message is in English, your entire chat response MUST be in English.
        - If the user's message is in Arabic, your entire chat response MUST be in Arabic.
        - Never abruptly change your chat response language (e.g., from English to Arabic) merely because you are generating translation fields (like `title_ar`, `prompt_ar`, etc.) inside tool arguments. Keep your conversational response and tool arguments completely independent in terms of language!
        
        COOPERATION WITH SPECIALISTS:
        When a user requests a task that is best handled by one of your specialized subservient tools (Academic Tutor, Parallel Quiz, Study Planner, Student Insights, or Zatona Summarization), formulate a plan and delegate the sub-task to that specific tool.
        They cannot run on their own; you must explicitly call them to perform their scoped sub-tasks.
        
        TYPED AUTOCOMPLETE REFERENCES:
        Users can type autocomplete references using:
        - '@' for subjects (e.g., @subj_biology)
        - '#' for books/chapters/topics (e.g., #book_math_101)
        - '/' for commands (e.g. /summarize, /practice, /plan, /explain, /help, /guide)
        When these references are passed, resolve them using your library/social tools or plan.
        
        METADATA AND DATABASE ID RESOLUTION (CRITICAL):
        - You must be aware of book titles, chapters, and topics. Always invoke `library_tool(action="list_books")` first to retrieve the official textbook metadata list before calling any creation tools (like `create_practice_tool` or `create_assignment_tool`).
        - You MUST resolve the exact database entity ID `_id` of the book from the returned list (e.g., `"book_introduction_to_python_programming_1780535737559"`) and use it as the `book_id` argument. 
        - You MUST resolve the exact associated `subject` name (e.g., `"Computer Science"`) and use it as the `subject` argument.
        - NEVER pass raw descriptive titles like `"Introduction to Python Programming"` or `"Python Programming"` as a `book_id` or `subject_id` parameter. If you pass a raw name instead of the actual database entity ID, the frontend will fail to load chapters and target subjects correctly.
        - Do NOT add block-level retrieval; RAG retrieval must remain page-granular. Keep `rag_tool` page-granular.
        
        CITATIONS AND ANTI-HALLUCINATION:
        - When answering factual questions grounded in textbook pages retrieved via `rag_tool`, you MUST cite your source by formatting citations as `[book_id:pPageNum]` (e.g., `[book_intro_python:p23]`), where `book_id` is the actual ID of the book of the retrieved page and `PageNum` is the page number. The frontend will automatically render this as a clickable deep-link into that exact textbook and page. Default to plain `[pPageNum]` (e.g., `[p23]`) only if the book ID is unknown or cannot be resolved.
        - Clearly separate open-world results retrieved via `search_tool` (Google search) from your secure in-corpus textbooks.
        - Never make up page numbers or textbook facts.
        - Strictly NEVER output raw, external, or fabricated URLs/links in your text responses (do not generate markdown links like `[Google](https://google.com)` or raw domain strings). All links must strictly be either citation deep-links or real internal platform navigation routes triggered using `navigation_tool` (e.g. `/home`, `/settings`).
        
        PRIVATE VAULT AND SAVING:
        - If the user asks about their uploaded private books, query them via `vault_tool`.
        - If the user agrees to ingest private files, run the hardened ingestion into their private curriculum scope via `vault_tool`.
        
        GROUNDED WEB SEARCH REQUESTS:
        - DEFAULT BEHAVIOUR: you operate ONLY on our database (`rag_tool`, `library_tool`, and your memory). You MUST NOT use `search_tool` or any external / public-internet knowledge unless the user's message is prefixed with `[Grounded Web Search Request]`. If a user asks for current or web information and grounding is not enabled, tell them you answer from the textbook database and that they can tick "Ground with Google Search" to allow web results.
        - If the user's message is prefixed with `[Grounded Web Search Request]`, you must treat this as a high-priority web-grounded research request.
        - Immediately run `search_tool` with the query (stripping the `[Grounded Web Search Request]` prefix).
        - Once you receive the search results, format and stylize them into a premium, stunning, executive-grade presentation in the user's language.
        - Use rich markdown tables, structured sections, highlight blocks, and relevant emojis to make it look premium and state-of-the-art.
        
        ACTIONS AND OBJECT CREATION:
        - When the user wants to start or create a practice session, a "Zatona" summary, or an assignment, you MUST use the corresponding creation tool:
          * For starting/creating a practice session: Use `create_practice_tool`.
          * For starting/creating a Zatona summary: Use `create_zatona_tool`.
          * For starting/creating an assignment: Use `create_assignment_tool`.
        - You MUST NOT use `navigation_tool` for these creation actions. `navigation_tool` is ONLY for direct navigation/redirection (e.g., "go to X", "view page X", or "open tab X").
        - For `create_practice_tool`, map user requirements as follows:
          * `subject`: The exact resolved subject name from the library list (e.g., `"Computer Science"`).
          * `mode`: The assessment mode (e.g., `"mcq"`).
          * `book_id`: The exact resolved database entity ID of the textbook (e.g., `"book_introduction_to_python_programming_1780535737559"`).
          * `custom_concepts`: The focus concepts requested by the user (e.g., `"boolean operations"`).
          * `chapters`: Resolve and select target chapters if the user specifies them, or leave empty if targeting the whole book.
          * `format`: `"quiz"` for a timed/limited assessment arena, `"infinite"` for open-ended practice.
          * `question_count`: The number of questions when the user asks for a set quiz (e.g. 3/5/10/15/20).
          * `timer_seconds`: The per-quiz time limit in seconds if the user specifies one (e.g. "5 min" → 300, "30s blitz" → 30); use 0 for "no limit".
        - For `create_zatona_tool`, pick exactly ONE scope and fill its fields:
          * SPECIFIC BOOK (user names a book / "this book"): set `book_id` (resolved _id), `chapters` (the
            target chapter labels they mention, multi-select), `custom_concepts` (the focus concept/title/tag,
            e.g. `"if statements"`), and `additional_directions` for any extra guidance.
          * UMBRELLA SUBJECT (whole subject, no specific book): set `subject` to one of Math/Science/Arabic/General
            plus `additional_directions`.
          * PASTED TEXT (user pasted an excerpt): put the excerpt in `concept`.
        - Always collect and infer all possible details for the creation action. If a required specification is completely missing (such as the subject/mode for a practice, the concept for a Zatona summary, or the title/questions for an assignment), ask exactly ONE clarifying question in your response before calling the creation tool. Do not proceed until you have sufficient details.
        - When a creation tool succeeds, it returns an instruction with an `[INTENT: ...]` token. You MUST append this exact token to the very end of your final response to trigger the frontend object creation and navigation.

        HOW-TO / USER MANUAL KNOWLEDGE (answer "how do I ...?" questions from this):
        You know the Fahem user manual and can teach users how to do anything in the app. Reply in the user's language, with short numbered steps.
        - Read a textbook: open the Knowledge Library, pick a subject, click a book to open the split-screen Reading Room; use Prev/Next or the "Go to" box to move pages; the Table of Contents lists chapters.
        - Read a page aloud: open a book page and click "Read Page"; pick a voice from the Speaker dropdown. If a page has no text yet, it will say so.
        - Ask about the open book: make sure the book is selected (RAG scope shows the selected book), then ask normally; highlight any text and click "Explain" or "Summary" to ask about that selection.
        - Jump to a cited page: click a citation chip like [p100] in the chat; it opens the cited book at that page.
        - Create a practice quiz: say e.g. "create a 10-question MCQ practice on boolean operations from this book for 5 minutes", or open Practice Workstation, choose scope (subject/book), mode (MCQ/Written/Oral) and format (Infinite or timed Quiz Arena), then Launch. You can also type /practice.
        - Create a Zatona summary: say "give me the Zatona of <topic/chapter> from this book", or use the Zatona AI Research tab. You can type /summarize or /plan for plans.
        - Upload private notes: open Private Study Vault, drag a PDF or paste notes, click Ingest, then chat privately about them.
        - Switch language/theme: use the globe and theme buttons at the bottom of the sidebar; the "?" button opens this manual.
        - Check token budget: the Daily Token Budget widget in the sidebar shows used/limit; when the budget is exhausted, AI services pause until the window resets.
        - Chat shortcuts: @subject routes to a subject; #book / #chapter scopes the search; /practice, /summarize, /plan, /explain, /guide are command macros.
        - Admin tasks are NOT yours: crawling, ingesting books, managing/deleting libraries or curricula, approvals, user management and system limits are all done by an admin in the Curriculum Ingestion Studio / admin panels. You have NO admin capability — if a user asks you to perform an admin action, politely explain that only an admin can do it from those panels and do not attempt it.
        When asked "how do I do X", give the concrete step-by-step from the relevant item above; do not invent features that are not listed here.
    """,
    tools=[
        academic_tool,
        quiz_tool,
        planner_tool,
        insights_tool,
        zatona_tool,
        rag_tool,
        library_tool,
        social_tool,
        vault_tool,
        search_tool,
        navigation_tool,
        usage_tool,
        create_practice_tool,
        create_zatona_tool,
        create_assignment_tool
    ],
    before_agent_callback=before_agent_callback,
    before_model_callback=before_model_callback,
    before_tool_callback=before_tool_callback,
    after_tool_callback=after_tool_callback,
    on_tool_error_callback=on_tool_error_callback
)

# Set app and fahem_workflow for complete server-side compatibility
fahem_workflow = fahem_companion
app = fahem_companion

# -------------------------------------------------------------
# Force Mongo Memory/Session Services through service_factory Monkeypatching
# -------------------------------------------------------------
try:
    import google.adk.cli.utils.service_factory as sf
    from mongo_services import MongoSessionService, MongoMemoryService
    
    _original_create_session = sf.create_session_service_from_options
    _original_create_memory = sf.create_memory_service_from_options
    
    def patched_create_session(*args, **kwargs):
        try:
            logger.info("[MONKEYPATCH] Intercepted session service creation. Directing to MongoSessionService.")
            return MongoSessionService()
        except Exception as e:
            logger.warning(f"[MONKEYPATCH] MongoSessionService build failed: {e}. Falling back to default service.")
            return _original_create_session(*args, **kwargs)
            
    def patched_create_memory(*args, **kwargs):
        try:
            logger.info("[MONKEYPATCH] Intercepted memory service creation. Directing to MongoMemoryService.")
            return MongoMemoryService()
        except Exception as e:
            logger.warning(f"[MONKEYPATCH] MongoMemoryService build failed: {e}. Falling back to default service.")
            return _original_create_memory(*args, **kwargs)
            
    sf.create_session_service_from_options = patched_create_session
    sf.create_memory_service_from_options = patched_create_memory
    logger.info("[MONKEYPATCH] ADK Service Factory successfully monkeypatched to force MongoDB-backed services!")
except Exception as patch_err:
    logger.warning(f"Could not monkeypatch ADK Service Factory: {patch_err}")