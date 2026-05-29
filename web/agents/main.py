import os
import sys

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

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
import pydantic

# Recursive sanitization for Pydantic models containing BSON types to prevent serialization failures
def sanitize_object(obj):
    if obj is None:
        return None
    obj_type_str = str(type(obj))
    if "bson" in obj_type_str or "Timestamp" in obj_type_str or "ObjectId" in obj_type_str:
        return str(obj)
    elif isinstance(obj, dict):
        return {k: sanitize_object(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_object(v) for v in obj]
    elif isinstance(obj, tuple):
        return tuple(sanitize_object(v) for v in obj)
    elif isinstance(obj, pydantic.BaseModel):
        try:
            dumped = obj.model_dump()
            sanitized = sanitize_object(dumped)
            return type(obj)(**sanitized)
        except Exception:
            return obj
    elif hasattr(obj, "__dict__"):
        for k, v in list(obj.__dict__.items()):
            if not k.startswith('_'):
                try:
                    setattr(obj, k, sanitize_object(v))
                except Exception:
                    pass
    return obj

try:
    import google.adk.models.google_llm as google_llm
    original_generate = google_llm.Gemini.generate_content_async
    async def patched_generate(self, request, *args, **kwargs):
        try:
            request.contents = [sanitize_object(c) for c in request.contents]
            request.config = sanitize_object(request.config)
        except Exception:
            pass
        async for event in original_generate(self, request, *args, **kwargs):
            yield event
    google_llm.Gemini.generate_content_async = patched_generate
except Exception:
    pass

try:
    from agent import mongodb_agent
except ImportError:
    from agents.agent import mongodb_agent

def load_local_env():
    """Loads variables from Next.js local env file to configure database URIs and API keys for local testing."""
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        env_path = os.path.join(base_dir, "web", ".env.local")
        if os.path.exists(env_path):
            print(f"Loading local configuration from: {env_path}")
            with open(env_path, "r") as f:
                for line in f:
                    if "=" in line and not line.strip().startswith("#"):
                        key, val = line.split("=", 1)
                        key = key.strip()
                        val = val.strip().strip('"').strip("'")
                        if key not in os.environ:
                            os.environ[key] = val
    except Exception as e:
        print(f"Warning: Failed to load local env: {e}")

def run_agent():
    load_local_env()
    
    # Check if GEMINI_API_KEY or Google Application Default Credentials are set. 
    # If using Vertex AI (project-based model), we must clear GEMINI_API_KEY to force OAuth2/ADC.
    is_vertex = mongodb_agent.model.startswith("projects/")
    if is_vertex:
        if "GEMINI_API_KEY" in os.environ:
            del os.environ["GEMINI_API_KEY"]
    else:
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("NEXT_PUBLIC_FIREBASE_API_KEY")
        if api_key and "GEMINI_API_KEY" not in os.environ:
            os.environ["GEMINI_API_KEY"] = api_key
        
    prompt = sys.argv[1] if len(sys.argv) > 1 else "List the databases, list collections for 'fahem' database, and retrieve database stats."
    print(f"\nPrompt: {prompt}")
    print("Starting Fahem MongoDB Agent runner...")
    
    session_service = InMemorySessionService()
    runner = Runner(
        agent=mongodb_agent,
        session_service=session_service,
        app_name="fahem",
        auto_create_session=True
    )
    
    try:
        msg = Content(role="user", parts=[Part.from_text(text=prompt)])
        print("Invoking agent execution loop...")
        events = runner.run(user_id="cli_user", session_id="session1", new_message=msg)
        
        final_text = ""
        for event in events:
            # Safely process and print events in ASCII/safe characters
            event_type = getattr(event, "event_type", "Unknown")
            print(f"[{event_type}] Processing event step...")
            
            # If the event contains model response or final outputs, collect them
            msg = getattr(event, "message", None)
            if msg and getattr(msg, "parts", None):
                for part in msg.parts:
                    if getattr(part, "text", None):
                        final_text += part.text
            elif getattr(event, "content", None):
                final_text += str(event.content)
            else:
                output = getattr(event, "output", None)
                if output:
                    candidates = getattr(output, "candidates", None)
                    if candidates:
                        for cand in candidates:
                            content = getattr(cand, "content", None)
                            if content and getattr(content, "parts", None):
                                for part in content.parts:
                                    if getattr(part, "text", None):
                                        final_text += part.text
            
            # Print intermediate tool calls if they occur
            tool_calls = getattr(event, "tool_calls", None)
            if tool_calls:
                for tc in tool_calls:
                    print(f" -> Agent requesting Tool Call: {getattr(tc, 'name', 'unnamed')}")
                    
        print("\n=== Agent Final Output ===")
        if final_text:
            print(final_text.encode('ascii', errors='replace').decode('ascii'))
        else:
            print("No output generated or execution finished without content.")
        print("==========================\n")
        
    except Exception as e:
        print(f"\nExecution error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_agent()
