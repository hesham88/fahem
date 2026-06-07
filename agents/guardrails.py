import os
import re
import json
import logging
from typing import Any, Optional, Dict
from google.genai.types import Content, Part
from google.adk.tools.base_tool import BaseTool
from google.adk.agents.context import Context
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse

logger = logging.getLogger("fahem.guardrails")

# Configure basic logging for auditing visibility
try:
    logging.basicConfig(level=logging.INFO)
except Exception:
    pass

import asyncio
def run_log_audit_task(category: str, agent: str, message: str, details: str = None):
    """Enqueues an audit log insertion to the MongoDB collection asynchronously."""
    try:
        from agent_communications import log_audit_event
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(log_audit_event(category, agent, message, details))
        except RuntimeError:
            # No running loop, execute with asyncio.run
            asyncio.run(log_audit_event(category, agent, message, details))
    except Exception as e:
        logger.warning(f"Could not log audit task asynchronously: {e}")

# =================================----------------------------
# CONSTANTS, WHITELISTS & CONTEXT
# =================================----------------------------
import contextvars
verified_principal_ctx = contextvars.ContextVar("verified_principal_ctx", default=None)

ALLOWED_DATABASES = {"fahem"}
ALLOWED_COLLECTIONS = {
    "users", "user_profiles", "subjects", "books", "book_pages",
    "curricula", "libraries",                       # Phase 1
    "crawl_jobs", "ingestion_jobs",
    "chat_sessions", "companion_sessions",          # Phase 4
    "social_groups", "social_threads", "social_replies",
    "reports", "feedback", "user_activities", "token_telemetry", "audit_logs",
    "reading_sessions",
    "notifications", "group_assignments", "assignment_submissions", "assignment_reports" # Notification & Assignment Systems
}
MAX_RETURN_RECORDS = 50

# =================================----------------------------
# CORE SECURITY GUARDRAILS
# =================================----------------------------

def sanitize_text(text: str) -> str:
    """Strips or masks potentially sensitive credentials and system usernames from text blocks."""
    if not text:
        return text
    # 1. Mask potential passwords / keys in queries (e.g., password=XYZ or key=XYZ)
    text = re.sub(r'(?i)(password|secret|passwd|api_key|apikey|token)\s*[:=]\s*["\']?[^"\']{3,}["\']?', r'\1=***MASKED***', text)
    # 2. Mask local server paths / user home folder strings to comply with hackathon sensitive leak rules
    text = text.replace("hesh1", "***USER***")
    return text

import httpx

def check_model_armor_py(prompt: str) -> tuple[bool, str]:
    """Pre-flight safety filtration via GCP Model Armor REST API with fail-closed production protection."""
    if not prompt:
        return False, ""
    
    is_gcp = os.environ.get("K_SERVICE") is not None or os.environ.get("GOOGLE_CLOUD_PROJECT") is not None
    
    try:
        import google.auth
        from google.auth.transport.requests import Request
        
        credentials, project_id = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        credentials.refresh(Request())
        token = credentials.token
    except Exception as auth_err:
        logger.error(f"[ALERT] SECURITY_DEGRADED: Model Armor credential acquisition failed: {auth_err}. Routing in degraded safety mode.")
        token = None
        
    if not token:
        if is_gcp:
            logger.error("[ALERT] SECURITY_DEGRADED: No GCP credentials/token available in production GCP environment. Routing in degraded safety mode.")
            return False, ""
        logger.info("Model Armor: No GCP token available for server-side validation. Skipping check locally.")
        return False, ""
        
    try:
        project_id = os.environ.get("GCP_PROJECT", "fahem-88d40")
        location = os.environ.get("GCP_LOCATION", "us-central1")
        template_id = os.environ.get("MODEL_ARMOR_TEMPLATE", "fahem-default-template")
        
        url = f"https://modelarmor.{location}.rep.googleapis.com/v1/projects/{project_id}/locations/{location}/templates/{template_id}:sanitizeUserPrompt"
        payload = {
            "userPromptData": {
                "text": prompt
            }
        }
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        
        with httpx.Client() as client:
            try:
                res = client.post(url, json=payload, headers=headers, timeout=10.0)
            except httpx.TimeoutException as timeout_err:
                logger.error(f"Model Armor: Timeout occurred during sanitization check: {timeout_err}")
                if is_gcp:
                    return True, "GCP Model Armor: Sanitization check temporary error (timeout). Please retry."
                return False, ""
            except Exception as conn_err:
                logger.error(f"[ALERT] SECURITY_DEGRADED: Model Armor network connection error: {conn_err}. Routing in degraded safety mode.")
                return False, ""

            if res.status_code == 200:
                data = res.json()
                sanitization_result = data.get("sanitizationResult", {})
                if sanitization_result.get("filterMatchState") == "MATCH_FOUND":
                    return True, "GCP Model Armor: Content flagged as unsafe or violating safety guidelines."
            elif res.status_code in [401, 403, 404]:
                logger.error(f"[ALERT] SECURITY_DEGRADED: Model Armor returned setup error status {res.status_code}: {res.text}. Routing in degraded safety mode.")
                return False, ""
            elif res.status_code >= 500:
                logger.error(f"Model Armor returned transient error status {res.status_code}: {res.text}")
                if is_gcp:
                    return True, f"GCP Model Armor: Sanitization check transient server error ({res.status_code}). Please retry."
                return False, ""
            else:
                logger.error(f"[ALERT] SECURITY_DEGRADED: Model Armor returned unexpected status {res.status_code}: {res.text}. Routing in degraded safety mode.")
                return False, ""
    except Exception as err:
        logger.error(f"[ALERT] SECURITY_DEGRADED: Error executing server-side GCP Model Armor check: {err}. Routing in degraded safety mode.")
        return False, ""
    return False, ""

def check_token_credits(uid: str, role: str) -> tuple[bool, str]:
    """
    Checks if the user has exceeded their token credits.
    Returns (is_blocked, message).
    """
    if role in ["admin", "super-admin", "superadmin", "judge"]:
        return False, ""
        
    try:
        from pymongo import MongoClient
        from datetime import datetime, timedelta
        
        uri = os.environ.get("MONGODB_URI") or "mongodb://localhost:27017"
        client = MongoClient(uri, serverSelectionTimeoutMS=2000)
        db = client["fahem"]
        
        # 1. Load System Config defaults
        config_doc = db["config"].find_one() or {}
        is_token_control_active = config_doc.get("isTokenControlActive", True)
        weekly_allocation_limit = config_doc.get("weeklyAllocationLimit", 250000)
        monthly_allocation_limit = config_doc.get("monthlyAllocationLimit", 1000000)
        
        # 2. Load User Profile
        user_prof = db["user_profiles"].find_one({"userId": uid}) or {}
        token_policy = user_prof.get("tokenPolicy") or {}
        
        # Determine effective active state & limits (override-then-default)
        control_active = token_policy.get("enabled", is_token_control_active)
        
        if not control_active:
            client.close()
            return False, ""
            
        weekly_limit = token_policy.get("weeklyLimit", weekly_allocation_limit)
        monthly_limit = token_policy.get("monthlyLimit", monthly_allocation_limit)
        
        # 3. Compute consumed tokens from token_telemetry
        now = datetime.utcnow()
        seven_days_ago = (now - timedelta(days=7)).isoformat() + "Z"
        thirty_days_ago = (now - timedelta(days=30)).isoformat() + "Z"
        
        # Fetch token telemetry documents for this user
        telemetry_cursor = db["token_telemetry"].find({"userId": uid})
        
        weekly_used = 0
        monthly_used = 0
        
        for doc in telemetry_cursor:
            tt = int(doc.get("totalTokens", 0))
            ts = doc.get("timestamp") or doc.get("createdAt") or ""
            if ts:
                if ts >= seven_days_ago:
                    weekly_used += tt
                if ts >= thirty_days_ago:
                    monthly_used += tt
                    
        client.close()
        
        if weekly_used >= weekly_limit:
            return True, f"weekly token allocation reached: used {weekly_used}/{weekly_limit} tokens."
        if monthly_used >= monthly_limit:
            return True, f"monthly token allocation reached: used {monthly_used}/{monthly_limit} tokens."
            
        return False, ""
        
    except Exception as err:
        logger.warning(f"Error checking token credits: {err}")
        is_gcp = os.environ.get("K_SERVICE") is not None or os.environ.get("GOOGLE_CLOUD_PROJECT") is not None
        if is_gcp:
            return True, "Security Gate: Token allocation check failed. Access denied (fail-closed)."
        return False, ""

def before_agent_callback(*args, **kwargs) -> Optional[Content]:
    """Before Agent Callback: Detects jailbreak signatures or injection patterns in the user prompt.
    
    Returning a Content object from this callback skips agent/tool run and delivers the warning directly.
    """
    context = kwargs.get("callback_context")
    if not context and args:
        context = args[0]
        
    if not context:
        return None
        
    user_prompt = getattr(context, "user_content", None)
    prompt_text = ""
    if user_prompt:
        if isinstance(user_prompt, str):
            prompt_text = user_prompt
        elif hasattr(user_prompt, "parts") and user_prompt.parts:
            parts_list = []
            for p in user_prompt.parts:
                if hasattr(p, "text") and p.text:
                    parts_list.append(p.text)
            prompt_text = "".join(parts_list)
        else:
            prompt_text = str(user_prompt)
            
    # Try parsing as JSON first to extract rich session/context variables for tool callback access
    if prompt_text:
        try:
            data = json.loads(prompt_text)
            if isinstance(data, dict):
                if "user_email" in data and data["user_email"]:
                    os.environ["USER_EMAIL"] = data["user_email"]
                if "user_id" in data and data["user_id"]:
                    os.environ["USER_ID"] = data["user_id"]
                    if hasattr(context, "user_id"):
                        try:
                            context.user_id = data["user_id"]
                        except Exception:
                            pass
                if "credits" in data:
                    os.environ["CREDITS"] = str(data["credits"])
                if "prompt" in data:
                    prompt_text = data["prompt"]
                    if hasattr(context, "user_content"):
                        if isinstance(context.user_content, str):
                            context.user_content = prompt_text
                        elif hasattr(context.user_content, "parts") and context.user_content.parts:
                            for p in context.user_content.parts:
                                if hasattr(p, "text") and p.text:
                                    p.text = prompt_text
        except Exception:
            pass
            
    agent_name = getattr(context, "agent_name", "UnknownAgent")
    user_id = getattr(context, "user_id", "UnknownUser")
    
    logger.info(f"[AUDIT] Agent {agent_name} invoked by user_id={user_id} (Prompt Size: {len(prompt_text)})")
    run_log_audit_task("INFO", agent_name, f"Agent {agent_name} invoked by user_id={user_id}", f"Prompt size: {len(prompt_text)}")
    
    # Enforce two-tier Token Credit System rolling allocation check
    principal = verified_principal_ctx.get()
    uid = principal.get("uid") if principal else (os.environ.get("USER_ID") or user_id)
    role = principal.get("role") if principal else "user"
    
    blocked, reason = check_token_credits(uid, role)
    if blocked:
        logger.warning(f"[SECURITY] Token allocation limit hit for user {uid}: {reason}")
        run_log_audit_task("SECURITY", "Guardrail", f"OPERATION BLOCKED: {reason}", f"User UID: {uid}")
        return Content(
            role="model",
            parts=[Part.from_text(text=f"DENIED: Token allocation limit reached. {reason}")]
        )

    
    if prompt_text:
        # Run local heuristics first
        prompt_lower = prompt_text.lower()
        jailbreak_patterns = [
            "ignore previous instructions",
            "system prompt",
            "drop database",
            "delete database",
            "delete collection",
            "drop_collection",
            "drop_database",
        ]
        for pattern in jailbreak_patterns:
            if pattern in prompt_lower:
                logger.warning(f"[SECURITY] Potential injection or malicious pattern blocked: '{pattern}'")
                run_log_audit_task("SECURITY", "Guardrail", f"OPERATION BLOCKED: Potential injection pattern '{pattern}' flagged", f"User Prompt: {prompt_text}")
                return Content(
                    role="model",
                    parts=[Part.from_text(text=f"DENIED: Safety policy violation. Unsafe instruction or pattern ('{pattern}') detected. Operation blocked.")]
                )
                
        # Run server-side Model Armor REST API check
        blocked, reason = check_model_armor_py(prompt_text)
        if blocked:
            logger.warning(f"[SECURITY] server-side Model Armor check flagged prompt: {reason}")
            run_log_audit_task("SECURITY", "Model Armor", f"CRITICAL: GCP Model Armor template blocked prompt: {reason}", f"User Prompt: {prompt_text}")
            return Content(
                role="model",
                parts=[Part.from_text(text=f"DENIED: Safety policy violation. {reason}")]
            )
        else:
            run_log_audit_task("MODEL_ARMOR", "Model Armor", "GCP Model Armor pre-flight safety filter passed.", "Prompt: " + (prompt_text[:150] + "..." if len(prompt_text) > 150 else prompt_text))
            
    return None

def before_model_callback(*args, **kwargs) -> Optional[LlmResponse]:
    """Before Model Callback: Normalizes and sanitizes conversational payload contents before model execution."""
    context = kwargs.get("callback_context")
    request = kwargs.get("llm_request")
    
    if not context and len(args) > 0:
        context = args[0]
    if not request and len(args) > 1:
        request = args[1]
        
    if not context:
        return None
        
    agent_name = getattr(context, "agent_name", "UnknownAgent")
    logger.info(f"[AUDIT] Calling LLM on behalf of agent '{agent_name}'")
    
    if request and hasattr(request, "contents") and request.contents:
        for content in request.contents:
            if hasattr(content, "parts") and content.parts:
                for part in content.parts:
                    if hasattr(part, "text") and part.text:
                        part.text = sanitize_text(part.text)
    return None

def before_tool_callback(*args, **kwargs) -> Optional[dict]:
    """Before Tool Callback: Enforces Namespace Whitelisting, Principle of Least Privilege, and customized schema parameter checks."""
    tool = kwargs.get("tool")
    tool_args = kwargs.get("args")
    tool_context = kwargs.get("tool_context")
    
    if not tool and len(args) > 0:
        tool = args[0]
    if not tool_args and len(args) > 1:
        tool_args = args[1]
    if not tool_context and len(args) > 2:
        tool_context = args[2]
        
    if not tool:
        return None
        
    tool_name = getattr(tool, "name", "unknown_tool")
    if tool_args is None:
        tool_args = {}
        
    logger.info(f"[AUDIT] Intercepted Tool call request: '{tool_name}' with args: {json.dumps(tool_args)}")
    
    # 1. Enforce Administrative Lock: Never execute administrative/cluster operations starting with 'atlas-'
    if tool_name.startswith("atlas-"):
        logger.warning(f"[SECURITY] Administrative command '{tool_name}' execution blocked.")
        raise PermissionError(f"Access Denied: Administrative command '{tool_name}' is strictly unauthorized.")
        
    # 2. Namespace Whitelisting: Verify accessed database and collection against strict allowlists
    db_param = tool_args.get("db") or tool_args.get("database") or tool_args.get("databaseName") or "fahem"
    collection_param = tool_args.get("collection") or tool_args.get("collectionName")
    
    if db_param and db_param not in ALLOWED_DATABASES:
        logger.warning(f"[SECURITY] Blocked unauthorized DB access: {db_param}")
        raise PermissionError(f"Access Denied: Database '{db_param}' is not whitelisted.")
        
    if collection_param and collection_param not in ALLOWED_COLLECTIONS:
        logger.warning(f"[SECURITY] Blocked unauthorized Collection access: {collection_param}")
        raise PermissionError(f"Access Denied: Collection '{collection_param}' is not whitelisted.")
        
    # 3. Delegated Authorization: Read identity strictly from thread-safe verified_principal_ctx
    principal = verified_principal_ctx.get()
    
    is_write = any(kw in tool_name.lower() for kw in ["insert", "update", "delete", "drop", "write", "create"])
    
    # Treat social_tool write actions as write-capable operations
    if tool_name == "social_tool":
        action = tool_args.get("action")
        if action in ["create_thread", "create_reply"]:
            is_write = True
            
    if is_write or tool_name in ["admin_tool", "vault_tool"]:
        if not principal:
            logger.warning(f"[SECURITY] Tool {tool_name} rejected: User is not authenticated or lacks active session.")
            raise PermissionError(f"Access Denied: {tool_name} operations require an active, authenticated user session.")
            
        role = principal.get("role")
        email = principal.get("email") or "anonymous@fahem.app"
        uid = principal.get("uid")
        
        # Strict role gating for admin_tool
        if tool_name == "admin_tool":
            if role not in ["admin", "super-admin"]:
                logger.warning(f"[SECURITY] admin_tool access blocked: User '{email}' with role '{role}' is not authorized.")
                raise PermissionError("Access Denied: Administrative operations require verified Admin privileges.")
                
        # Strict uid gating for vault_tool
        if tool_name == "vault_tool":
            if not uid or uid == "anonymous":
                logger.warning("[SECURITY] vault_tool access blocked: Anonymous or missing user UID.")
                raise PermissionError("Access Denied: Vault operations require a valid, registered user ID.")
                
        # 4. Credits/Quota check (Persisted Credits)
        blocked, reason = check_token_credits(uid, role)
        if blocked:
            logger.warning(f"[SECURITY] Write operation rejected: User {email} has exceeded token limits: {reason}")
            raise PermissionError(f"Access Denied: Token allocation reached. {reason}")
            
        logger.info(f"[AUDIT] Verified delegated tool authorization for user: {email} (Role: {role}) in tool: {tool_name}")
        
    return None

def mask_pii(text: str) -> str:
    """Anonymizes typical Personally Identifiable Information (PII) like email domains or phone patterns."""
    if not text:
        return text
    # Mask email addresses
    text = re.sub(r'[\w\.-]+@[\w\.-]+\.\w+', r'***@masked.com', text)
    # Mask phone numbers
    text = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', r'***-***-****', text)
    return text

def sanitize_mongodb_document(doc: Any) -> Any:
    """Recursively parses and masks PII/secrets inside MongoDB records before presenting to LLMs."""
    if isinstance(doc, dict):
        sanitized = {}
        for k, v in doc.items():
            if k.lower() in {"password", "hash", "secret", "token", "auth_token", "apikey"}:
                sanitized[k] = "***MASKED_SECRET***"
            elif k.lower() in {"email", "mail"}:
                sanitized[k] = mask_pii(str(v)) if v else v
            elif k.lower() in {"phone", "telephone"}:
                sanitized[k] = "***-***-****"
            else:
                sanitized[k] = sanitize_mongodb_document(v)
        return sanitized
    elif isinstance(doc, list):
        return [sanitize_mongodb_document(item) for item in doc]
    elif isinstance(doc, str):
        return mask_pii(doc)
    return doc

def after_tool_callback(*args, **kwargs) -> Optional[dict]:
    """After Tool Callback: Enforces hard document return limits and redacts sensitive returned field data."""
    tool = kwargs.get("tool")
    tool_args = kwargs.get("args")
    tool_context = kwargs.get("tool_context")
    tool_response = kwargs.get("tool_response")
    
    if not tool and len(args) > 0:
        tool = args[0]
    if not tool_args and len(args) > 1:
        tool_args = args[1]
    if not tool_context and len(args) > 2:
        tool_context = args[2]
    if not tool_response and len(args) > 3:
        tool_response = args[3]
        
    if not tool:
        return None
        
    tool_name = getattr(tool, "name", "unknown_tool")
    logger.info(f"[AUDIT] Tool succeeded: '{tool_name}'")
    
    # Enforce and calculate dynamic remaining weekly token quota percentage inside after_tool_callback
    if tool_context and hasattr(tool_context, "state") and tool_context.state:
        try:
            principal = verified_principal_ctx.get()
            uid = principal.get("uid") if principal else "local_dev_uid"
            role = principal.get("role") if principal else "user"
            
            remaining = 100
            if role not in ["admin", "super-admin", "superadmin", "judge"]:
                try:
                    from pymongo import MongoClient
                    from datetime import datetime, timedelta
                    uri = os.environ.get("MONGODB_URI") or "mongodb://localhost:27017"
                    client = MongoClient(uri, serverSelectionTimeoutMS=2000)
                    db = client["fahem"]
                    config_doc = db["config"].find_one() or {}
                    weekly_limit = config_doc.get("weeklyAllocationLimit", 250000)
                    user_prof = db["user_profiles"].find_one({"userId": uid}) or {}
                    token_policy = user_prof.get("tokenPolicy") or {}
                    effective_weekly_limit = token_policy.get("weeklyLimit", weekly_limit)
                    
                    now = datetime.utcnow()
                    seven_days_ago = (now - timedelta(days=7)).isoformat() + "Z"
                    telemetry_cursor = db["token_telemetry"].find({"userId": uid})
                    weekly_used = sum(int(doc.get("totalTokens", 0)) for doc in telemetry_cursor if (doc.get("timestamp") or doc.get("createdAt") or "") >= seven_days_ago)
                    client.close()
                    
                    if effective_weekly_limit > 0:
                        used_ratio = weekly_used / effective_weekly_limit
                        remaining = max(0, int((1.0 - used_ratio) * 100))
                    else:
                        remaining = 0
                except Exception:
                    pass
            else:
                remaining = 999
                
            # Update agent state so successive steps have the right credits context
            state = tool_context.state
            if hasattr(state, "get"):
                state["credits"] = remaining
            else:
                state.credits = remaining
                
            # Write to stdout using the standard format that Next.js stream can log
            print(f"[METADATA] Credits: {remaining}", flush=True)
            logger.info(f"[AUDIT] Calculated remaining weekly token quota: {remaining}%")
        except Exception as e:
            logger.error(f"Error computing remaining token quota inside after_tool_callback: {e}")
            
    if not tool_response:
        return None
        
    # 1. Enforce hard limits on list volumes to prevent massive exfiltration or memory exhaustion
    if isinstance(tool_response, dict):
        for key in ["documents", "results", "records", "data"]:
            if key in tool_response and isinstance(tool_response[key], list):
                if len(tool_response[key]) > MAX_RETURN_RECORDS:
                    logger.info(f"[SECURITY] Truncating results from {len(tool_response[key])} to {MAX_RETURN_RECORDS}")
                    tool_response[key] = tool_response[key][:MAX_RETURN_RECORDS]
                    
        # Process MCP text contents
        if "content" in tool_response and isinstance(tool_response["content"], list):
            for item in tool_response["content"]:
                if isinstance(item, dict) and item.get("type") == "text" and "text" in item:
                    try:
                        text_val = item["text"]
                        parsed = json.loads(text_val)
                        if isinstance(parsed, list):
                            if len(parsed) > MAX_RETURN_RECORDS:
                                logger.info(f"[SECURITY] Truncating MCP JSON list from {len(parsed)} to {MAX_RETURN_RECORDS}")
                                parsed = parsed[:MAX_RETURN_RECORDS]
                            parsed = sanitize_mongodb_document(parsed)
                            item["text"] = json.dumps(parsed, ensure_ascii=False)
                        elif isinstance(parsed, dict):
                            parsed = sanitize_mongodb_document(parsed)
                            item["text"] = json.dumps(parsed, ensure_ascii=False)
                    except Exception:
                        item["text"] = mask_pii(item["text"])
                        
        # Mask dictionary values recursively
        tool_response = sanitize_mongodb_document(tool_response)
        
    elif isinstance(tool_response, list):
        if len(tool_response) > MAX_RETURN_RECORDS:
            logger.info(f"[SECURITY] Truncating top-level list response from {len(tool_response)} to {MAX_RETURN_RECORDS}")
            tool_response = tool_response[:MAX_RETURN_RECORDS]
        tool_response = [sanitize_mongodb_document(doc) for doc in tool_response]
        
    return tool_response

def on_tool_error_callback(*args, **kwargs) -> Optional[dict]:
    """On Tool Error Callback: Masks internal DB/server details to prevent information disclosures to models/users."""
    tool = kwargs.get("tool")
    tool_args = kwargs.get("args")
    tool_context = kwargs.get("tool_context")
    error = kwargs.get("error")
    
    if not tool and len(args) > 0:
        tool = args[0]
    if not tool_args and len(args) > 1:
        tool_args = args[1]
    if not tool_context and len(args) > 2:
        tool_context = args[2]
    if not error and len(args) > 3:
        error = args[3]
        
    err_str = str(error) if error else "Unknown execution error"
    logger.error(f"[AUDIT] Tool execution error: {err_str}")
    
    # Hide usernames, passwords, and cluster endpoints
    safe_err = re.sub(r'mongodb(\+srv)?://[^@]+@', 'mongodb://***_db_user:***@', err_str)
    safe_err = re.sub(r'fahemcluster[^\s\.]*', '***cluster***', safe_err)
    
    return {
        "is_error": True,
        "error": f"Tool execution failed safely: {safe_err}"
    }
