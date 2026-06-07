import sys
import os
import inspect

# Reconfigure stdout to use utf-8 to avoid encoding errors
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    import google.adk.sessions._session_util as su
    print("session_util functions:")
    for name, member in inspect.getmembers(su, predicate=inspect.isfunction):
        print(f"\n--- Function: {name} ---")
        try:
            print(inspect.getsource(member))
        except Exception as e:
            print("No source:", e)
except Exception as e:
    print("Error:", e)
