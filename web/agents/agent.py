import os
import json

# Monkeypatch BSON types for Pydantic V2 serialization compatibility inside ADK logging
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

from mcp import StdioServerParameters
from google.adk.tools.mcp_tool import StdioConnectionParams, McpToolset
from google.adk import Agent

try:
    from tools import get_mongodb_uri
except ImportError:
    from agents.tools import get_mongodb_uri

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

# 1. Resolve local @mongodb-js/mongodb-mcp-server dist/index.js if it exists to avoid npx download overhead
agents_dir = os.path.dirname(os.path.abspath(__file__))
local_mcp_server = os.path.join(
    os.path.dirname(agents_dir), 
    "node_modules", 
    "@mongodb-js", 
    "mongodb-mcp-server", 
    "dist", 
    "index.js"
)

if os.path.exists(local_mcp_server):
    cmd = "node"
    args = [local_mcp_server]
else:
    cmd = "npx.cmd" if os.name == "nt" else "npx"
    args = ["-y", "@mongodb-js/mongodb-mcp-server"]

# 2. Configure MongoDB MCP server parameters
server_params = StdioServerParameters(
    command=cmd,
    args=args,
    env={"MDB_MCP_CONNECTION_STRING": get_mongodb_uri()}
)

# 3. Create the ADK-compatible MCP Toolset client wrapper
connection_params = StdioConnectionParams(server_params=server_params)
mcp_toolset = McpToolset(connection_params=connection_params)

# 4. Construct the Python-based ADK Agent with integrated MCP and native tools
mongodb_agent = Agent(
    name="FahemMongoDBAgent",
    model=get_model_name(),
    instruction="""
        You are the Fahem MongoDB Database Agent.
        You assist the user in inspecting database collections, examining schemas, and running diagnostics.
        You have direct access to the official MongoDB MCP server tools (connect, list-collections, find, aggregate, etc.).
        Always ensure sensitive information such as server paths, raw IPs, and password fields are fully masked.
        
        CRITICAL: Do NOT attempt to call any administrative tools starting with 'atlas-' (such as 'atlas-list-clusters', 'atlas-list-projects', etc.). These tools require restricted organization-level Programmatic API Keys and specific whitelisted IPs, and will fail with '403 Forbidden'. Stick strictly to standard database-level operations like 'list-collections', 'db-stats', 'find', 'insert-many', and 'update-many'.
        
        To connect to the database:
        1. Always call the 'get_mongodb_uri' tool first to retrieve the active MongoDB connection string.
        2. Call the MCP 'connect' tool passing the retrieved connection string as the 'connectionString' parameter.
        3. Only after a successful connection should you list collections or run other queries.
        
        You MUST respond to the user in the language they write in or explicitly request.
        You natively support the following 7 languages:
        - English (en)
        - Arabic (ar)
        - French (fr)
        - German (de)
        - Spanish (es)
        - Italian (it)
        - Chinese (zh)
        Translate your explanations, diagnostics, descriptions, and outputs into the user's selected language, while preserving technical/system identifiers such as database and collection names (e.g. 'fahem', 'users') as is.
    """,
    tools=[
        mcp_toolset,
        get_mongodb_uri
    ]
)
