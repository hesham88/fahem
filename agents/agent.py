import os
import json
import httpx
from pydantic import BaseModel, Field
from typing import Any

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
try:
    from mongodb_agent.agent import mongodb_agent as local_mongodb_agent
except ImportError:
    from agents.mongodb_agent.agent import mongodb_agent as local_mongodb_agent

# -------------------------------------------------------------
# 2. Multi-Agent Orchestration workflow setup
# -------------------------------------------------------------

# Define Workflow State Schema
class WorkflowState(BaseModel):
    original_prompt: str = ""
    language: str = "en"
    user_email: str = ""
    user_id: str = ""
    username: str = ""
    credits: int = 100
    guardrail_passed: bool = False
    guardrail_reason: str = ""
    database_results: str = ""
    execution_success: bool = False
    final_output: str = ""
    onboarding: bool = False

# Import the Orchestrator Agent
try:
    from orchestrator_agent.agent import orchestrator_agent
except ImportError:
    from agents.orchestrator_agent.agent import orchestrator_agent

# Import the Guardrail Agent
try:
    from guardrail_agent.agent import guardrail_agent
except ImportError:
    from agents.guardrail_agent.agent import guardrail_agent


# -------------------------------------------------------------
# 2b. Conversational Onboarding Agent Setup (Imported)
# -------------------------------------------------------------

try:
    from onboarding_agent.agent import onboarding_agent
except ImportError:
    from agents.onboarding_agent.agent import onboarding_agent



# -------------------------------------------------------------
# 3. Workflow Node Functions
# -------------------------------------------------------------

async def orchestrator_node_func(ctx, node_input: Any) -> str:
    """Orchestrator receives user input and seeds state variables."""
    prompt_str = str(node_input).strip()
    
    # Try parsing as JSON first to extract rich session/context variables
    is_json = False
    is_onboarding = False
    try:
        data = json.loads(prompt_str)
        if isinstance(data, dict):
            if "prompt" in data:
                is_json = True
                ctx.state["original_prompt"] = data.get("prompt", "")
                ctx.state["language"] = data.get("language") or os.environ.get("LANGUAGE", "en")
                ctx.state["user_email"] = data.get("user_email") or os.environ.get("USER_EMAIL", "")
                ctx.state["user_id"] = data.get("user_id") or os.environ.get("USER_ID", "")
                ctx.state["username"] = data.get("username") or os.environ.get("USERNAME", "anonymous")
                ctx.state["credits"] = int(data.get("credits", 100))
            if data.get("onboarding") is True:
                is_onboarding = True
    except Exception:
        pass
        
    if not is_json:
        ctx.state["original_prompt"] = prompt_str
        ctx.state["language"] = os.environ.get("LANGUAGE", "en")
        ctx.state["user_email"] = os.environ.get("USER_EMAIL", "")
        ctx.state["user_id"] = os.environ.get("USER_ID", "")
        ctx.state["username"] = os.environ.get("USERNAME", "anonymous")
        ctx.state["credits"] = 100
        
    if is_onboarding:
        ctx.state["onboarding"] = True
        ctx.route = "onboarding"
    else:
        ctx.state["onboarding"] = False
        ctx.route = "standard"
        
    return f"Orchestrator seed prompt: {ctx.state['original_prompt']}"

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

async def onboarding_node_func(ctx, node_input: Any) -> str:
    """Conversational Onboarding Agent Node."""
    user_id = ctx.state.get("user_id", "")
    email = ctx.state.get("user_email", "")
    
    onboarding_agent.instruction = f"""
        You are the Fahem Conversational Onboarding Assistant.
        Your sole goal is to naturally, warmly, and politely onboard a new user into the Fahem platform.
        You support both English and Arabic. Respond in the language used by the user.
        
        The current user's authenticated ID is '{user_id}' and their email is '{email}'.
        Use this user_id '{user_id}' when calling 'save_user_profile_tool'.
        
        Ensure you gather the following fields:
        1. Role / User Type: Must be "student", "teacher", "parent", or "admin". Explain what each does if asked.
        2. Full Name: Smartly extract the actual name (e.g. remove polite prefixes like "My name is", "اسمي هو", "انا").
        3. Username: Ask for a unique username (e.g. jane_doe). It must be at least 3 chars and alphanumeric/underscores.
           - CRITICAL: You MUST verify username availability by calling 'check_username_availability_tool' before proceeding! If taken, suggest alternatives or ask for another.
        4. Age: Ask for their age.
           - CRITICAL: Enforce common-sense human age limits (3 to 120 years). If a user provides an invalid age (e.g. 0, 1, 2, or > 120), politely ask for a realistic age.
           - If they are a "student" and age < 13: You MUST ask for their parent's email address.
        5. Country: Ask for their country.
        6. Educational Grade Level: (Only if they are a "student").
           - Offer a recommended grade based on their age and country, or let them specify a custom grade, select lifelong learning, or skip.
        7. School Name: (Only if "student" or "teacher"). Ask for their school. You can suggest common ones or let them type.
        8. Children Count & Children in School Count: (Only if "parent" or "teacher"). Ask how many children they have, and how many are in school.
        
        IMPORTANT RULES:
        - Converse naturally. Do not ask for all fields at once! Ask for 1 or 2 fields at a time to keep it a premium, conversational experience.
        - DO NOT disclose any internal database schemas, collections, or technical metrics. You are a conversational counselor, not a database administrator!
        - If the user asks "what can you do?" or other general questions, politely explain your role as an onboarding assistant here to guide them through setting up their custom space, explaining clearly what fields you need to collect.
        - When all required fields are collected and validated, call 'save_user_profile_tool' with the user's ID '{user_id}' and all fields in the JSON payload!
        - Ensure 'onboardingCompleted' is set to True in the payload.
        - Once the save tool reports success, output a final welcoming message telling the user their profile is ready and onboarding is complete. Include the phrase "SUCCESS_ONBOARDING_COMPLETE" in your final response when the profile has been successfully saved.
    """
    
    res = await ctx.run_node(onboarding_agent, ctx.state.get("original_prompt", ""))
    ctx.state["final_output"] = res
    return res

# -------------------------------------------------------------
# 4. Compile the Workflow Graph DAG
# -------------------------------------------------------------
orchestrator_node = FunctionNode(name="orchestrator_node", func=orchestrator_node_func, rerun_on_resume=True)
guardrail_node = FunctionNode(name="guardrail_node", func=guardrail_node_func, rerun_on_resume=True)
mongodb_node = FunctionNode(name="mongodb_node", func=mongodb_node_func, rerun_on_resume=True)
presenter_node = FunctionNode(name="presenter_node", func=presenter_node_func, rerun_on_resume=True)
onboarding_node = FunctionNode(name="onboarding_node", func=onboarding_node_func, rerun_on_resume=True)

edges = [
    Edge(from_node=START, to_node=orchestrator_node),
    Edge(from_node=orchestrator_node, to_node=onboarding_node, route="onboarding"),
    Edge(from_node=orchestrator_node, to_node=guardrail_node, route="standard"),
    Edge(from_node=guardrail_node, to_node=mongodb_node, route="execute"),
    Edge(from_node=guardrail_node, to_node=presenter_node, route="deny"),
    Edge(from_node=mongodb_node, to_node=presenter_node)
]

fahem_workflow = Workflow(
    name="FahemOrchestratorWorkflow",
    state_schema=WorkflowState,
    edges=edges
)

# Expose 'app' for compatibility with Next.js frontend calling /run with app_name: "app"
app = local_mongodb_agent


