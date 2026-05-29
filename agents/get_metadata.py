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

logger = logging.getLogger("fahem.get_metadata")

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

async def _run_mcp_tool(tool_name: str, args: dict) -> json:
    """Helper to programmatically invoke a specific MCP tool inside mcp_toolset."""
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

async def get_metadata(database: str = "fahem") -> dict:
    """Fetches MongoDB database stats and collection list exclusively via the MongoDB MCP agent."""
    try:
        # 1. Establish database connection via MCP Connect tool
        uri = get_mongodb_uri()
        try:
            await _run_mcp_tool("connect", {"connectionStringOrClusterName": uri})
        except Exception as conn_err:
            logger.warning(f"Connection over MCP failed: {conn_err}")
            
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
        meta = asyncio.run(get_metadata())
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
