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

# =================================----------------------------
# CONSTANTS & WHITELISTS
# =================================----------------------------
ALLOWED_DATABASES = {"fahem", "sample_mflix"}
ALLOWED_COLLECTIONS = {"users", "movies", "reports", "comments"}
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
            
    agent_name = getattr(context, "agent_name", "UnknownAgent")
    user_id = getattr(context, "user_id", "UnknownUser")
    
    logger.info(f"[AUDIT] Agent {agent_name} invoked by user_id={user_id} (Prompt Size: {len(prompt_text)})")
    
    if prompt_text:
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
                return Content(
                    role="model",
                    parts=[Part.from_text(text=f"DENIED: Safety policy violation. Unsafe instruction or pattern ('{pattern}') detected. Operation blocked.")]
                )
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
    db_param = tool_args.get("db") or tool_args.get("database") or tool_args.get("databaseName")
    collection_param = tool_args.get("collection") or tool_args.get("collectionName")
    
    if db_param and db_param not in ALLOWED_DATABASES:
        logger.warning(f"[SECURITY] Blocked unauthorized DB access: {db_param}")
        raise PermissionError(f"Access Denied: Database '{db_param}' is not whitelisted.")
        
    if collection_param and collection_param not in ALLOWED_COLLECTIONS:
        logger.warning(f"[SECURITY] Blocked unauthorized Collection access: {collection_param}")
        raise PermissionError(f"Access Denied: Collection '{collection_param}' is not whitelisted.")
        
    # 3. Delegated Authorization & Principle of Least Privilege: Force session checks for mutations
    is_write = any(kw in tool_name.lower() for kw in ["insert", "update", "delete", "drop", "write", "create"])
    if is_write:
        user_email = ""
        if tool_context and hasattr(tool_context, "state") and tool_context.state:
            try:
                user_email = tool_context.state.get("user_email")
            except Exception:
                pass
                
        if not user_email:
            logger.warning("[SECURITY] Write operation rejected: User is not authenticated or lacks active session.")
            raise PermissionError("Access Denied: Write operations require an active, authenticated user session.")
            
        logger.info(f"[AUDIT] Verified delegated write authorization for user: {user_email}")
        
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
