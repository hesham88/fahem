import sys
import os
import inspect

# Reconfigure stdout to use utf-8 to avoid encoding errors
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from google.adk.sessions.in_memory_session_service import InMemorySessionService
    print("InMemorySessionService helpers:")
    for name, member in inspect.getmembers(InMemorySessionService, predicate=inspect.isfunction):
        if name.startswith("_") and not name.startswith("__"):
            try:
                print(f"\n--- InMemorySessionService Helper: {name} ---")
                print(inspect.getsource(member))
            except Exception as e:
                print(f"Could not get source: {e}")
except Exception as e:
    print("Error:", e)

try:
    import google.adk.sessions.in_memory_session_service as imss
    print("\nModule level variables or imports in in_memory_session_service:")
    for name, member in inspect.getmembers(imss):
        if "_session_util" in name or "util" in name:
            print(f"  {name}: {member}")
except Exception as e:
    pass
