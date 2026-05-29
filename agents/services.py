import sys
import os
import logging
import fastapi

logger = logging.getLogger("google_adk." + __name__)

# Helper to register route on a FastAPI app
def register_metadata_route(app: fastapi.FastAPI):
    # Check if the route is already registered to avoid duplication
    for route in app.routes:
        if hasattr(route, "path") and route.path == "/db-metadata":
            return

    @app.get("/db-metadata")
    async def custom_db_metadata():
        try:
            # Add agents directory to sys.path to allow imports
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            
            from get_metadata import get_metadata
            
            # Fetch metadata natively using get_metadata()
            meta = await get_metadata()
            return meta
        except Exception as err:
            logger.error(f"[services.py] Failed to retrieve DB metadata: {err}", exc_info=True)
            return {
                "databaseName": "fahem",
                "collectionsCount": "...",
                "collectionList": "...",
                "storageSize": "...",
                "indexCount": "...",
                "status": f"Disconnected (Error in custom endpoint: {str(err)})"
            }
            
    @app.get("/audit-logs")
    async def get_logs_endpoint():
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from get_metadata import get_audit_logs
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
            from get_metadata import log_audit_event
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
            from get_metadata import log_user_activity
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
            from get_metadata import get_user_activities
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
            from get_metadata import save_chat_session
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
            from get_metadata import get_user_sessions
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
            from get_metadata import get_session_detail
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
            from get_metadata import delete_session
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
            from get_metadata import log_token_usage
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
            from get_metadata import get_user_token_stats
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
            from get_metadata import get_all_activities, get_global_token_stats
            activities = await get_all_activities()
            token_stats = await get_global_token_stats()
            return {"activities": activities, "tokenStats": token_stats}
        except Exception as err:
            logger.error(f"[services.py] Failed to get global stats: {err}", exc_info=True)
            return {"activities": [], "tokenStats": {}, "error": str(err)}

    @app.get("/user/profile")
    async def get_profile_endpoint(userId: str):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from get_metadata import get_user_profile
            profile = await get_user_profile(userId)
            return {"profile": profile}
        except Exception as err:
            logger.error(f"[services.py] Failed to get user profile: {err}", exc_info=True)
            return {"profile": {}, "error": str(err)}

    @app.post("/user/profile")
    async def post_profile_endpoint(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from get_metadata import save_user_profile
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
            from get_metadata import delete_user_account
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
            from get_metadata import get_all_users
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
            from get_metadata import add_friend, remove_friend
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
            from get_metadata import save_chat_message
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
            from get_metadata import get_chat_history
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
            from get_metadata import get_pending_children
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
            from get_metadata import approve_child
            data = await request.json()
            parent_email = data.get("parentEmail", "")
            child_id = data.get("childId", "")
            success = await approve_child(parent_email, child_id)
            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to approve child: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    logger.info("Mounted custom database, logging, activity, session, and token routes onto FastAPI application.")

# 1. Universal Patch: fastapi.FastAPI.__init__
try:
    original_fastapi_init = fastapi.FastAPI.__init__
    def patched_fastapi_init(self, *args, **kwargs):
        original_fastapi_init(self, *args, **kwargs)
        register_metadata_route(self)
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
                register_metadata_route(app)
                return app
            ServerClass.get_fast_api_app = patched_get_app
            logger.info(f"Successfully applied monkeypatch to {ServerClass.__name__}.get_fast_api_app")
        except Exception as e:
            logger.warning(f"Could not monkeypatch {ServerClass.__name__}: {e}")

patch_server_class(ApiServer)
patch_server_class(DevServer)
