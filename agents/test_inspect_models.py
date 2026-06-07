import sys
import os
import inspect
from pydantic import BaseModel

# Reconfigure stdout to use utf-8 to avoid encoding errors
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

print("Inspecting Session and Event models...")

try:
    from google.adk.sessions import Session, BaseSessionService
    from google.adk import Event
    
    print("\nSession fields:")
    for name, field in Session.model_fields.items():
        print(f"  {name}: {field.annotation} (default: {field.default})")
        
    print("\nEvent fields:")
    for name, field in Event.model_fields.items():
        print(f"  {name}: {field.annotation} (default: {field.default})")
        
    print("\nBaseSessionService source code of methods:")
    for name, member in inspect.getmembers(BaseSessionService, predicate=inspect.isfunction):
        if not name.startswith("_") or name == "__init__":
            try:
                src = inspect.getsource(member)
                print(f"\n--- Method: {name} ---")
                print(src)
            except Exception as e:
                print(f"Could not get source for {name}: {e}")
except Exception as e:
    print("Error:", e)

try:
    from google.adk.memory import BaseMemoryService
    print("\nBaseMemoryService source code of methods:")
    for name, member in inspect.getmembers(BaseMemoryService, predicate=inspect.isfunction):
        if not name.startswith("_") or name == "__init__":
            try:
                src = inspect.getsource(member)
                print(f"\n--- Method: {name} ---")
                print(src)
            except Exception as e:
                print(f"Could not get source for {name}: {e}")
except Exception as e:
    print("Error:", e)
