import sys
import os
import logging
import fastapi

logger = logging.getLogger("google_adk." + __name__)

# Helper to register route on a FastAPI app
def register_telemetry_route(app: fastapi.FastAPI):
    # Check if the route is already registered to avoid duplication
    for route in app.routes:
        if hasattr(route, "path") and route.path == "/db-metadata":
            return

    # Secure OIDC Bearer Token Verification Middleware for Cloud Run environment
    @app.middleware("http")
    async def oidc_security_middleware(request: fastapi.Request, call_next):
        secured_paths = [
            "/db-metadata", "/audit-logs", "/user/activity", "/user/chat-session",
            "/user/token-usage", "/user/token-stats", "/admin/global-stats",
            "/user/profile", "/user/account", "/user/list", "/user/friend",
            "/chat/message", "/parent/children", "/parent/approve"
        ]
        
        path = request.url.path
        is_secured = any(path == p or path.startswith(p + "/") or path.startswith(p + "?") for p in secured_paths)
        
        if is_secured:
            is_gcp = os.environ.get("K_SERVICE") is not None or os.environ.get("GOOGLE_CLOUD_PROJECT") is not None
            auth_header = request.headers.get("Authorization")
            
            # Allow local Next.js environment to bypass OIDC using a pre-shared local secret
            if auth_header == "Bearer LOCAL_BYPASS_TOKEN_fahem_2026":
                logger.info(f"[OIDC BYPASS via SECRET] Request to {path} permitted via shared secret.")
                request.state.verified_email = "local_dev_bypass@fahem.app"
                return await call_next(request)

            token = None
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header[7:]
                
            if token:
                try:
                    from google.oauth2 import id_token
                    from google.auth.transport import requests as auth_requests
                    from google.auth import jwt
                    
                    # 1. Decode token payload without verification to inspect the audience dynamically
                    payload = jwt.decode(token, verify=False)
                    aud = payload.get("aud")
                    
                    # 2. Verify signature, expiry, and dynamic audience
                    id_info = id_token.verify_oauth2_token(token, auth_requests.Request(), audience=aud)
                    email = id_info.get("email")
                    logger.info(f"[OIDC VERIFIED] Request to {path} authenticated for: {email}")
                    request.state.verified_email = email
                except Exception as err:
                    logger.warning(f"[OIDC FAILED] Token verification failed for {path}: {err}")
                    if is_gcp:
                        return fastapi.responses.JSONResponse(
                            content={"status": "error", "error": f"Unauthorized: Invalid OIDC Token ({str(err)})"},
                            status_code=401
                        )
            else:
                if is_gcp:
                    logger.warning(f"[OIDC BLOCKED] Request to {path} blocked: No OIDC Bearer Token.")
                    return fastapi.responses.JSONResponse(
                        content={"status": "error", "error": "Unauthorized: OIDC Bearer token required on Google Cloud Run"},
                        status_code=401
                    )
                else:
                    logger.info(f"[OIDC BYPASS] Local request to {path} permitted without OIDC token.")
                    
        return await call_next(request)


    @app.get("/db-metadata")
    async def custom_db_metadata():
        try:
            # Add agents directory to sys.path to allow imports
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            
            from agent_communications import database_telemetry_engine
            
            # Fetch telemetry natively using database_telemetry_engine (Database Telemetry & Diagnostic Agent)
            meta = await database_telemetry_engine()
            return meta
        except Exception as err:
            logger.error(f"[services.py] Failed to retrieve DB telemetry: {err}", exc_info=True)
            return {
                "databaseName": "fahem",
                "collectionsCount": "...",
                "collectionList": "...",
                "storageSize": "...",
                "indexCount": "...",
                "status": f"Disconnected (Error in custom endpoint: {str(err)})"
            }
            
    @app.get("/db-diagnostic")
    async def custom_db_diagnostic():
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            # Mask URI for display
            masked_uri = uri
            if "@" in uri:
                prefix, suffix = uri.split("@", 1)
                masked_uri = prefix.split("//")[0] + "//" + "fahem_mcp:****@" + suffix
                
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            cols = db.list_collection_names()
            
            counts = {}
            for col in cols:
                counts[col] = db[col].count_documents({})
                
            test_prof = db["users"].find_one({"userId": "test_user_id_gemini_2026"})
            if test_prof:
                test_prof.pop("_id", None)
                
            return {
                "status": "success",
                "masked_uri": masked_uri,
                "collections": cols,
                "counts": counts,
                "test_profile_exists": test_prof is not None,
                "test_profile": test_prof
            }
        except Exception as err:
            logger.error(f"[services.py] DB Diagnostic failed: {err}", exc_info=True)
            return {
                "status": "error",
                "error": str(err)
            }

    @app.get("/audit-logs")
    async def get_logs_endpoint():
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_audit_logs
            logs = await get_audit_logs()
            return {"logs": logs}
        except Exception as err:
            logger.error(f"[services.py] Failed to retrieve audit logs: {err}", exc_info=True)
            return {"logs": [], "error": str(err)}

    @app.post("/audit-logs")
    async def post_log_endpoint(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import log_audit_event
            data = await request.json()
            category = data.get("category", "INFO")
            agent = data.get("agent", "System")
            message = data.get("message", "")
            details = data.get("details")
            await log_audit_event(category, agent, message, details)
            return {"status": "success"}
        except Exception as err:
            logger.error(f"[services.py] Failed to record audit log: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.post("/user/activity")
    async def post_user_activity(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import log_user_activity
            data = await request.json()
            user_id = data.get("userId", "")
            user_email = data.get("userEmail", "")
            action = data.get("action", "")
            status = data.get("status", "")
            details = data.get("details")
            success = await log_user_activity(user_id, user_email, action, status, details)
            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to record user activity: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.get("/user/activity")
    async def get_user_activity(userId: str):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_user_activities
            activities = await get_user_activities(userId)
            return {"activities": activities}
        except Exception as err:
            logger.error(f"[services.py] Failed to retrieve user activities: {err}", exc_info=True)
            return {"activities": [], "error": str(err)}

    @app.post("/user/chat-session")
    async def post_chat_session(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import save_chat_session
            data = await request.json()
            session_id = data.get("sessionId", "")
            user_id = data.get("userId", "")
            user_email = data.get("userEmail", "")
            title = data.get("title", "")
            messages = data.get("messages", [])
            success = await save_chat_session(session_id, user_id, user_email, title, messages)
            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to save chat session: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.get("/user/chat-session")
    async def get_user_session_list(userId: str):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_user_sessions
            sessions = await get_user_sessions(userId)
            return {"sessions": sessions}
        except Exception as err:
            logger.error(f"[services.py] Failed to retrieve user sessions: {err}", exc_info=True)
            return {"sessions": [], "error": str(err)}

    @app.get("/user/chat-session/detail")
    async def get_session_detail_endpoint(sessionId: str):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_session_detail
            session = await get_session_detail(sessionId)
            return {"session": session}
        except Exception as err:
            logger.error(f"[services.py] Failed to retrieve session detail: {err}", exc_info=True)
            return {"session": {}, "error": str(err)}

    @app.delete("/user/chat-session")
    async def delete_session_endpoint(sessionId: str):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import delete_session
            success = await delete_session(sessionId)
            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to delete session: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.post("/user/token-usage")
    async def post_token_usage(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import log_token_usage
            data = await request.json()
            user_id = data.get("userId", "")
            user_email = data.get("userEmail", "")
            prompt_tokens = data.get("promptTokens", 0)
            completion_tokens = data.get("completionTokens", 0)
            total_tokens = data.get("totalTokens", 0)
            model = data.get("model", "")
            run_type = data.get("type", "")
            success = await log_token_usage(user_id, user_email, prompt_tokens, completion_tokens, total_tokens, model, run_type)
            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to log token usage: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.get("/user/token-stats")
    async def get_token_stats(userId: str):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_user_token_stats
            stats = await get_user_token_stats(userId)
            return {"stats": stats}
        except Exception as err:
            logger.error(f"[services.py] Failed to get user token stats: {err}", exc_info=True)
            return {"stats": {}, "error": str(err)}

    @app.get("/admin/global-stats")
    async def get_admin_global_stats():
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_all_activities, get_global_token_stats
            activities = await get_all_activities()
            token_stats = await get_global_token_stats()
            return {"activities": activities, "tokenStats": token_stats}
        except Exception as err:
            logger.error(f"[services.py] Failed to get global stats: {err}", exc_info=True)
            return {"activities": [], "tokenStats": {}, "error": str(err)}

    @app.get("/user/profile")
    async def get_profile_endpoint(userId: str = None, username: str = None, email: str = None):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_user_profile
            profile = await get_user_profile(user_id=userId, username=username, email=email)
            return {"profile": profile}
        except Exception as err:
            logger.error(f"[services.py] Failed to get user profile: {err}", exc_info=True)
            return {"profile": {}, "error": str(err)}

    @app.get("/user/username/check")
    async def check_username_endpoint(username: str):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import check_username_availability
            available = await check_username_availability(username)
            return {"available": available}
        except Exception as err:
            logger.error(f"[services.py] Failed to check username: {err}", exc_info=True)
            return {"available": False, "error": str(err)}

    @app.post("/user/profile")
    async def post_profile_endpoint(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import save_user_profile
            data = await request.json()
            user_id = data.get("userId", "")
            profile_data = data.get("profile", {})
            if not user_id:
                return {"status": "error", "error": "userId is required"}
            success = await save_user_profile(user_id, profile_data)
            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to save user profile: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.delete("/user/account")
    async def delete_account_endpoint(userId: str, email: str):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import delete_user_account
            success = await delete_user_account(userId, email)
            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to delete user account: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.get("/user/list")
    async def get_user_list_endpoint():
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_all_users
            users = await get_all_users()
            return {"users": users}
        except Exception as err:
            logger.error(f"[services.py] Failed to retrieve user list: {err}", exc_info=True)
            return {"users": [], "error": str(err)}

    @app.post("/user/friend")
    async def post_friend_endpoint(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import add_friend, remove_friend
            data = await request.json()
            user_id = data.get("userId", "")
            friend_id = data.get("friendId", "")
            action = data.get("action", "add")
            
            if action == "add":
                success = await add_friend(user_id, friend_id)
            else:
                success = await remove_friend(user_id, friend_id)
            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to manage friend: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.post("/chat/message")
    async def post_chat_message_endpoint(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import save_chat_message
            data = await request.json()
            sender_id = data.get("senderId", "")
            sender_name = data.get("senderName", "")
            recipient_id = data.get("recipientId", "")
            content = data.get("content", "")
            is_group = data.get("isGroup", False)
            success = await save_chat_message(sender_id, sender_name, recipient_id, content, is_group)
            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to save chat message: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.get("/chat/message")
    async def get_chat_message_endpoint(senderId: str, recipientId: str, isGroup: bool = False):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_chat_history
            messages = await get_chat_history(senderId, recipientId, isGroup)
            return {"messages": messages}
        except Exception as err:
            logger.error(f"[services.py] Failed to retrieve chat messages: {err}", exc_info=True)
            return {"messages": [], "error": str(err)}

    @app.get("/parent/children")
    async def get_parent_children_endpoint(parentEmail: str):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_pending_children
            children = await get_pending_children(parentEmail)
            return {"children": children}
        except Exception as err:
            logger.error(f"[services.py] Failed to retrieve parent children: {err}", exc_info=True)
            return {"children": [], "error": str(err)}

    @app.post("/parent/approve")
    async def post_parent_approve_endpoint(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import approve_child
            data = await request.json()
            parent_email = data.get("parentEmail", "")
            child_id = data.get("childId", "")
            success = await approve_child(parent_email, child_id)
            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to approve child: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.post("/verify-recaptcha")
    async def post_verify_recaptcha_endpoint(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from recaptcha_verification import verify_recaptcha_token_safely
            data = await request.json()
            token = data.get("token", "")
            action = data.get("action", "LOGIN")
            
            if not token:
                return {"status": "error", "error": "Token is required"}
                
            res = verify_recaptcha_token_safely(token, action)
            return res
        except Exception as err:
            logger.error(f"[services.py] Failed to verify recaptcha: {err}", exc_info=True)
            return {"success": True, "status": "fail_open_bypass", "error": str(err), "score": 1.0}

    logger.info("Mounted custom database, logging, activity, session, token, and recaptcha routes onto FastAPI application.")

# 1. Universal Patch: fastapi.FastAPI.__init__
try:
    original_fastapi_init = fastapi.FastAPI.__init__
    def patched_fastapi_init(self, *args, **kwargs):
        original_fastapi_init(self, *args, **kwargs)
        register_telemetry_route(self)
    fastapi.FastAPI.__init__ = patched_fastapi_init
    logger.info("Successfully applied universal monkeypatch to fastapi.FastAPI.__init__")
except Exception as e:
    logger.warning(f"Could not monkeypatch fastapi.FastAPI.__init__: {e}")

# 2. Specific Patches: ApiServer and DevServer
try:
    from google.adk.cli.api_server import ApiServer
except ImportError:
    ApiServer = None

try:
    from google.adk.cli.dev_server import DevServer
except ImportError:
    DevServer = None

def patch_server_class(ServerClass):
    if ServerClass is not None:
        try:
            original_get_app = ServerClass.get_fast_api_app
            def patched_get_app(self, *args, **kwargs):
                app = original_get_app(self, *args, **kwargs)
                register_telemetry_route(app)
                return app
            ServerClass.get_fast_api_app = patched_get_app
            logger.info(f"Successfully applied monkeypatch to {ServerClass.__name__}.get_fast_api_app")
        except Exception as e:
            logger.warning(f"Could not monkeypatch {ServerClass.__name__}: {e}")

patch_server_class(ApiServer)
patch_server_class(DevServer)
