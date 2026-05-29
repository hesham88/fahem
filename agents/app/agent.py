try:
    from agent import fahem_workflow
except ImportError:
    from agents.agent import fahem_workflow

# Expose 'fahem_workflow' as the main app entry point
app = fahem_workflow
root_agent = app

