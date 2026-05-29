import os
import json
import httpx
from pydantic import BaseModel, Field
from typing import Any

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
from google.adk.workflow import Workflow, Edge, START, FunctionNode

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

# -------------------------------------------------------------
# 1. Standalone / Fallback MongoDB MCP Agent Node Config
# -------------------------------------------------------------
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

server_params = StdioServerParameters(
    command=cmd,
    args=args,
    env={"MDB_MCP_CONNECTION_STRING": get_mongodb_uri()}
)

connection_params = StdioConnectionParams(server_params=server_params)
mcp_toolset = McpToolset(connection_params=connection_params)

# Local fallback MongoDB MCP Agent
local_mongodb_agent = Agent(
    name="FahemLocalMongoDBAgent",
    model=get_model_name(),
    instruction="""
        You are the local Fahem MongoDB Database Agent fallback.
        You assist in executing database collections inspection, exams schemas, diagnostics and record creation.
        You have direct access to standard database tools.
        Always mask server paths and sensitive fields.
        CRITICAL: Do NOT attempt 'atlas-' admin tools. Call 'get_mongodb_uri' first, then 'connect'.
    """,
    tools=[mcp_toolset, get_mongodb_uri]
)

# -------------------------------------------------------------
# 2. Multi-Agent Orchestration workflow setup
# -------------------------------------------------------------

# Define Workflow State Schema
class WorkflowState(BaseModel):
    original_prompt: str = ""
    language: str = "en"
    user_email: str = ""
    user_id: str = ""
    guardrail_passed: bool = False
    guardrail_reason: str = ""
    database_results: str = ""
    execution_success: bool = False
    final_output: str = ""

# Define the Orchestrator Agent
orchestrator_agent = Agent(
    name="FahemOrchestratorAgent",
    model=get_model_name(),
    instruction="""
        You are the Fahem Multi-Agent Orchestrator.
        Your job is to receive, process, and beautifully format database operations or security alerts for the user dashboard.
        
        When compiling database output results:
        1. Avoid raw JSON or BSON dumps.
        2. Construct highly professional, premium Markdown tables, lists, or structured cards.
        3. Localize explanations, text, table headers, and statuses fully into the user's selected language.
        4. Preserve technical names such as collection names, database names, or specific keys as-is.
        
        When presenting a security denial message:
        1. Explain politely in the requested language that security guardrails blocked the execution.
        2. Highlight the active safety enforcement without releasing internal developer secrets.
    """
)

# Define the Guardrail Agent
guardrail_agent = Agent(
    name="FahemGuardrailAgent",
    model=get_model_name(),
    instruction="""
        You are the Fahem Security Guardrail Agent.
        Your sole role is to audit user prompts, queries, and user context to verify they are secure and authorized.
        
        You must perform these strict checks:
        1. **Authentication Gate**: Inspect if a valid 'user_email' or 'user_id' is provided. For standard inspections or queries (read-only), allow anonymous/unauthenticated access. For WRITE operations (inserting, updating, deleting, or reporting), a valid user email is STRICTLY REQUIRED. If empty or anonymous during a write operation, reject with 'UNAUTHORIZED: User must be signed-in to perform write operations'.
        2. **Administrative Lock**: Strictly reject any commands or tools starting with 'atlas-'. Standard users should never manage clusters or projects.
        3. **Injection and Drop Protection**: Block malicious injection payloads or destructive operations like dropping/deleting databases, unless it's a valid and authenticated report creation.
        
        If all criteria are fully met, respond exactly with "CONFIRMED: Authorized".
        If any criteria fail, respond with "DENIED: <clear explanation in the user's requested language>".
    """
)

# -------------------------------------------------------------
# 3. Workflow Node Functions
# -------------------------------------------------------------

async def orchestrator_node_func(ctx, node_input: Any) -> str:
    """Orchestrator receives user input and seeds state variables."""
    prompt_str = str(node_input)
    
    # Store essential parameters into state
    ctx.state["original_prompt"] = prompt_str
    ctx.state["language"] = os.environ.get("LANGUAGE", "en")
    ctx.state["user_email"] = os.environ.get("USER_EMAIL", "")
    ctx.state["user_id"] = os.environ.get("USER_ID", "")
    
    return f"Orchestrator seed prompt: {prompt_str}"

async def guardrail_node_func(ctx, node_input: Any) -> str:
    """Guardrail verifies safety, permissions, and authentication."""
    # We formulate a structured review package for the guardrail agent
    review_payload = {
        "user_prompt": ctx.state.get("original_prompt", ""),
        "user_email": ctx.state.get("user_email", ""),
        "user_id": ctx.state.get("user_id", ""),
        "language": ctx.state.get("language", "en")
    }
    
    review_input = json.dumps(review_payload, ensure_ascii=False)
    guard_res = await ctx.run_node(guardrail_agent, review_input)
    
    # Resolve routing direction based on Guardrail's verdict
    if "CONFIRMED" in guard_res:
        ctx.state["guardrail_passed"] = True
        ctx.state["guardrail_reason"] = ""
        ctx.route = "execute"
    else:
        ctx.state["guardrail_passed"] = False
        ctx.state["guardrail_reason"] = guard_res
        ctx.route = "deny"
        
    return guard_res

async def mongodb_node_func(ctx, node_input: Any) -> str:
    """Executes the query against MongoDB MCP (Cloud Run microservice or local fallback)."""
    # Try calling newly deployed MongoDB MCP Agent on Cloud Run via HTTP if URL is set
    cloud_run_url = os.environ.get("MONGODB_AGENT_URL", "").strip()
    
    if cloud_run_url:
        print(f"Workflow routing execution to Cloud Run MongoDB service: {cloud_run_url}")
        try:
            # Structure standard run payload conforming to ADK RunAgentRequest schema
            payload = {
                "user_id": ctx.state.get("user_id") or "anonymous",
                "session_id": "fahem_microservice_session",
                "app_name": "app",
                "new_message": {
                    "role": "user",
                    "parts": [{"text": ctx.state.get("original_prompt", "")}]
                },
                "streaming": False
            }
            
            headers = {}
            try:
                from google.auth.transport.requests import Request
                from google.oauth2 import id_token
                # Fetch identity token with target Cloud Run service audience to authenticate requests
                token = id_token.fetch_id_token(Request(), cloud_run_url)
                headers["Authorization"] = f"Bearer {token}"
                print("Secured authenticated GCP ID token for agent-to-agent communication.")
            except Exception as auth_err:
                print(f"Agent authenticated identity retrieval skipped: {auth_err}")
                
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{cloud_run_url}/run", 
                    json=payload, 
                    headers=headers,
                    timeout=60.0
                )
                
                if response.status_code == 200:
                    res_data = response.json()
                    # Parse final answer text from standard ADK runner response payload
                    out_msg = res_data.get("output", {}).get("message", {})
                    out_text = ""
                    if out_msg and "parts" in out_msg:
                        out_text = "".join([part.get("text", "") for part in out_msg["parts"] if "text" in part])
                    
                    if not out_text:
                        out_text = str(res_data)
                        
                    ctx.state["database_results"] = out_text
                    ctx.state["execution_success"] = True
                    return out_text
                else:
                    raise Exception(f"Microservice HTTP error: {response.status_code} - {response.text}")
                    
        except Exception as err:
            print(f"Cloud Run request failed: {err}. Falling back to local MongoDB execution.")
            
    # Fallback to local MongoDB execution loop
    db_res = await ctx.run_node(local_mongodb_agent, ctx.state.get("original_prompt", ""))
    ctx.state["database_results"] = db_res
    ctx.state["execution_success"] = True
    return db_res

async def presenter_node_func(ctx, node_input: Any) -> str:
    """Orchestrator finalizes and presents output nicely to the user."""
    lang = ctx.state.get("language", "en")
    
    if ctx.state.get("guardrail_passed"):
        presentation_prompt = f"""
        Format and present the following database results nicely in {lang} for the user dashboard.
        Use clean Markdown tables, lists, or structured highlights.
        Ensure it feels extremely premium and clear.
        
        Raw Database Results:
        {ctx.state.get("database_results", "")}
        """
    else:
        presentation_prompt = f"""
        Present a polite security denial message in {lang} to the user explaining why their request was blocked.
        Highlight that security guardrails are active and administrative/unauthorized operations are blocked.
        
        Reason for denial:
        {ctx.state.get("guardrail_reason", "")}
        """
        
    final_output = await ctx.run_node(orchestrator_agent, presentation_prompt)
    ctx.state["final_output"] = final_output
    return final_output

# -------------------------------------------------------------
# 4. Compile the Workflow Graph DAG
# -------------------------------------------------------------
orchestrator_node = FunctionNode(name="orchestrator_node", func=orchestrator_node_func, rerun_on_resume=True)
guardrail_node = FunctionNode(name="guardrail_node", func=guardrail_node_func, rerun_on_resume=True)
mongodb_node = FunctionNode(name="mongodb_node", func=mongodb_node_func, rerun_on_resume=True)
presenter_node = FunctionNode(name="presenter_node", func=presenter_node_func, rerun_on_resume=True)

edges = [
    Edge(from_node=START, to_node=orchestrator_node),
    Edge(from_node=orchestrator_node, to_node=guardrail_node),
    Edge(from_node=guardrail_node, to_node=mongodb_node, route="execute"),
    Edge(from_node=guardrail_node, to_node=presenter_node, route="deny"),
    Edge(from_node=mongodb_node, to_node=presenter_node)
]

fahem_workflow = Workflow(
    name="FahemOrchestratorWorkflow",
    state_schema=WorkflowState,
    edges=edges
)
