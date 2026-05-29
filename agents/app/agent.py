try:
    from mongodb_agent.agent import root_agent
except ImportError:
    from agents.mongodb_agent.agent import root_agent

# Expose 'root_agent' and 'app' as fallback
app = root_agent
