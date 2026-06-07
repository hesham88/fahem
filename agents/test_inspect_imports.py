import sys
import os
import inspect

# Reconfigure stdout to use utf-8 to avoid encoding errors
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    import google.adk.sessions.in_memory_session_service as imss
    print("Module level names in in_memory_session_service module:")
    for name in dir(imss):
        val = getattr(imss, name)
        if inspect.isclass(val) or "Error" in name or "time" in name or "uuid" in name:
            print(f"  {name}: {val}")
except Exception as e:
    print("Error:", e)
