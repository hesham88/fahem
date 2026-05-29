import sys
import os
import logging

logger = logging.getLogger("google_adk." + __name__)

try:
    from google.adk.cli.api_server import ApiServer
except ImportError:
    logger.warning("Could not import ApiServer in services.py to apply monkeypatch.")
    ApiServer = None

if ApiServer is not None:
    original_get_fast_api_app = ApiServer.get_fast_api_app

    def patched_get_fast_api_app(self, *args, **kwargs):
        # Call the original to get the FastAPI app instance
        app = original_get_fast_api_app(self, *args, **kwargs)
        
        # Add custom route for database metadata
        @app.get("/db-metadata")
        async def custom_db_metadata():
            try:
                # Add agents directory to sys.path to allow imports
                agents_dir = os.path.dirname(os.path.abspath(__file__))
                if agents_dir not in sys.path:
                    sys.path.insert(0, agents_dir)
                
                from get_metadata import get_metadata
                
                # Fetch metadata natively using get_metadata()
                meta = get_metadata()
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

        logger.info("Successfully mounted custom /db-metadata route onto ADK FastAPI application.")
        return app

    # Apply monkeypatch
    ApiServer.get_fast_api_app = patched_get_fast_api_app
