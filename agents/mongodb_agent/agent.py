import os
import json

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

from mcp import StdioServerParameters
from google.adk.tools.mcp_tool import StdioConnectionParams, McpToolset
from google.adk import Agent
from .tools import get_mongodb_uri

# Import Secure Parameterized Tools and Callbacks
try:
    from secure_tools import (
        lookup_user_by_id,
        search_users_by_email,
        insert_user_report,
        inspect_collection_schema,
        get_whitelisted_db_stats
    )
    from guardrails import (
        before_agent_callback,
        before_model_callback,
        before_tool_callback,
        after_tool_callback,
        on_tool_error_callback
    )
except ImportError:
    from agents.secure_tools import (
        lookup_user_by_id,
        search_users_by_email,
        insert_user_report,
        inspect_collection_schema,
        get_whitelisted_db_stats
    )
    from agents.guardrails import (
        before_agent_callback,
        before_model_callback,
        before_tool_callback,
        after_tool_callback,
        on_tool_error_callback
    )

def get_model_name() -> str:
    """Resolves model name dynamically based on environment or configuration."""
    model = os.environ.get("GEMINI_MODEL")
    if model:
        return model
    return "gemini-3.1-flash-lite"

# 1. Resolve local @mongodb-js/mongodb-mcp-server dist/index.js if it exists to avoid npx download overhead
micro_dir = os.path.dirname(os.path.abspath(__file__))
agents_dir = os.path.dirname(micro_dir)

possible_paths = [
    os.path.join(os.path.dirname(agents_dir), "web", "node_modules", "@mongodb-js", "mongodb-mcp-server", "dist", "index.js"),
    os.path.join(os.path.dirname(agents_dir), "node_modules", "@mongodb-js", "mongodb-mcp-server", "dist", "index.js"),
    os.path.join(agents_dir, "node_modules", "@mongodb-js", "mongodb-mcp-server", "dist", "index.js"),
    os.path.join("/app", "node_modules", "@mongodb-js", "mongodb-mcp-server", "dist", "index.js")
]

local_mcp_server = None
for p in possible_paths:
    if os.path.exists(p):
        local_mcp_server = p
        break

if local_mcp_server:
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

# 4. Construct the mongodb agent with custom parameterized tools & callbacks
root_agent = Agent(
    name="FahemMongoDBAgent",
    model=get_model_name(),
    instruction="""
        You are the Fahem MongoDB Database Agent deployed on Google Cloud Run.
        You assist the user in safely inspecting database collections, examining schemas, running diagnostics, and writing records.
        You have direct access to high-level, parameterized secure tools (lookup_user_by_id, search_users_by_email, insert_user_report, etc.).
        You also have standard access to MongoDB MCP tools, which are heavily monitored, whitelisted, and audited under strict security guardrails.
        
        CRITICAL: Do NOT attempt to call any administrative tools starting with 'atlas-'. Stick strictly to standard whitelisted operations.
        Always ensure sensitive information such as server paths, raw IPs, and password fields are fully masked.
        
        To query or modify data:
        1. Prefer using specific parameterized tools (such as lookup_user_by_id, search_users_by_email, insert_user_report, inspect_collection_schema, get_whitelisted_db_stats) whenever possible. This prevents raw query injection and ensures the highest level of security.
        2. Only fallback to standard database-level MCP operations (connect, find, list-collections) if high-level parameterized tools do not cover the requested operation.
        
        You MUST respond to the user in the language they write in or explicitly request.
        Translate explanations, diagnostics, descriptions, and outputs into the user's selected language, while preserving technical/system identifiers such as database and collection names (e.g. 'fahem', 'users') as is.
        
        RESPONSE FORMATTING & CLEANLINESS:
        1. Keep your final response clean, concise, elegant, and professional.
        2. Do NOT list intermediate connection retries, tool execution logs, or technical diagnostics (such as failed connection attempts or formatting retries) in your final response to the user. Only display the final successful results.
    """,
    tools=[
        mcp_toolset,
        get_mongodb_uri,
        lookup_user_by_id,
        search_users_by_email,
        insert_user_report,
        inspect_collection_schema,
        get_whitelisted_db_stats
    ],
    before_agent_callback=before_agent_callback,
    before_model_callback=before_model_callback,
    before_tool_callback=before_tool_callback,
    after_tool_callback=after_tool_callback,
    on_tool_error_callback=on_tool_error_callback
)

# Expose both for compatibility
mongodb_agent = root_agent
app = root_agent
