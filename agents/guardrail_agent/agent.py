import os
from google.adk import Agent

def get_model_name() -> str:
    """Resolves model name dynamically based on environment or configuration."""
    model = os.environ.get("GEMINI_MODEL")
    if model:
        return model
    return "gemini-3.1-flash-lite"

# Define the Guardrail Agent
root_agent = Agent(
    name="FahemSecurityGuardrailAgent",
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

# Expose both for compatibility
guardrail_agent = root_agent
app = root_agent

