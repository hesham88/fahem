import sys
import os
import inspect

# Reconfigure stdout to use utf-8 to avoid encoding errors
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from google.adk.sessions.in_memory_session_service import InMemorySessionService
    print("InMemorySessionService loaded!")
    for name, member in inspect.getmembers(InMemorySessionService, predicate=inspect.isfunction):
        if not name.startswith("_") or name == "__init__":
            try:
                print(f"\n--- InMemorySessionService Method: {name} ---")
                print(inspect.getsource(member))
            except Exception as e:
                print(f"Could not get source: {e}")
except Exception as e:
    print("Error:", e)
