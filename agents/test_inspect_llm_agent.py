import sys
import os
import inspect

# Reconfigure stdout to use utf-8 to avoid encoding errors
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from google.adk.agents import LlmAgent
    print("LlmAgent imported!")
    print("LlmAgent fields:")
    for name, field in LlmAgent.model_fields.items():
        print(f"  {name}: {field.annotation} (default: {field.default})")
    
    print("\nLlmAgent __init__ signature:")
    print(inspect.signature(LlmAgent.__init__))
except Exception as e:
    print("Error:", e)
