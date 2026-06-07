import sys
import os
import inspect

# Reconfigure stdout to use utf-8 to avoid encoding errors
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from google.adk.memory.in_memory_memory_service import InMemoryMemoryService
    print("InMemoryMemoryService loaded!")
    for name, member in inspect.getmembers(InMemoryMemoryService, predicate=inspect.isfunction):
        if not name.startswith("_") or name == "__init__":
            try:
                print(f"\n--- InMemoryMemoryService Method: {name} ---")
                print(inspect.getsource(member))
            except Exception as e:
                print(f"Could not get source: {e}")
except Exception as e:
    print("Error:", e)
