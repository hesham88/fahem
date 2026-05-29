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

    logger.info("Mounted custom /db-metadata and /audit-logs routes onto FastAPI application.")

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
