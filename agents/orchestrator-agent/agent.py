import os
from google.adk import Agent

def get_model_name() -> str:
    """Resolves model name dynamically based on environment or configuration."""
    model = os.environ.get("GEMINI_MODEL")
    if model:
        return model
    return "gemini-3.1-flash-lite"

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

# Expose 'app' for routing compatibility
app = orchestrator_agent
