import sys
import os

# Reconfigure stdout to use utf-8 to avoid encoding errors
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import google.adk

modules_to_try = [
    "google.adk.sessions.in_memory_session_service",
    "google.adk.memory.in_memory_memory_service",
    "google.adk.sessions",
    "google.adk.memory",
    "google.adk.sessions.base_session_service",
    "google.adk.memory.base_memory_service",
]

for m in modules_to_try:
    try:
        mod = __import__(m, fromlist=["*"])
        print(f"\nSuccessfully imported: {m}")
        for attr in dir(mod):
            if "InMemory" in attr or "Memory" in attr or "Session" in attr:
                print(f"  {attr}")
    except Exception as e:
        print(f"Failed to import {m}: {e}")
