import sys
import os

# Reconfigure stdout to use utf-8 to avoid encoding errors
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

print("Inspecting google.adk submodules...")

try:
    import google.adk.sessions
    print("google.adk.sessions contents:", dir(google.adk.sessions))
except Exception as e:
    print("Error importing sessions:", e)

try:
    import google.adk.memory
    print("google.adk.memory contents:", dir(google.adk.memory))
except Exception as e:
    print("Error importing memory:", e)

# Let's inspect specific common class names or search them
def search_submodule(mod_name):
    try:
        mod = __import__(mod_name, fromlist=["*"])
        print(f"\n--- {mod_name} ---")
        for attr in dir(mod):
            if "Session" in attr or "Memory" in attr or "Service" in attr or "Agent" in attr:
                print(f"  {attr}: {type(getattr(mod, attr))}")
    except Exception as e:
        print(f"Error searching {mod_name}: {e}")

search_submodule("google.adk.sessions")
search_submodule("google.adk.memory")
search_submodule("google.adk.agents")
search_submodule("google.adk.tools")
search_submodule("google.adk")

try:
    # Let's try to import Agent types
    from google.adk.agents import Agent, LlmAgent, PlannerAgent
    print("Loaded Agent types from google.adk.agents!")
except Exception as e:
    print("Error importing from google.adk.agents:", e)
