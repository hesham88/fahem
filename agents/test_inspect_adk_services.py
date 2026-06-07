import sys
import os
import inspect

# Reconfigure stdout to use utf-8 to avoid encoding errors
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

print("Inspecting base service classes...")

try:
    from google.adk.sessions import BaseSessionService, Session
    print("BaseSessionService imported!")
    print("Session imported!")
    
    print("\nBaseSessionService methods and signatures:")
    for name, member in inspect.getmembers(BaseSessionService):
        if not name.startswith("_") or name == "__init__":
            try:
                sig = inspect.signature(member)
                print(f"  {name}{sig}")
            except Exception:
                print(f"  {name} (no signature available)")
except Exception as e:
    print("Error with BaseSessionService:", e)

try:
    from google.adk.memory import BaseMemoryService
    print("\nBaseMemoryService imported!")
    print("\nBaseMemoryService methods and signatures:")
    for name, member in inspect.getmembers(BaseMemoryService):
        if not name.startswith("_") or name == "__init__":
            try:
                sig = inspect.signature(member)
                print(f"  {name}{sig}")
            except Exception:
                print(f"  {name} (no signature available)")
except Exception as e:
    print("Error with BaseMemoryService:", e)
