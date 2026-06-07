import sys
import os

# Reconfigure stdout to use utf-8 to avoid encoding errors
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

print("Searching google.adk package modules...")

import pkgutil
import google.adk

def find_in_module(mod):
    found = []
    for attr_name in dir(mod):
        if "Response" in attr_name or "Entry" in attr_name or "Session" in attr_name or "Memory" in attr_name:
            found.append(f"{mod.__name__}.{attr_name}")
    return found

import google.adk.sessions.base_session_service
print("base_session_service:", dir(google.adk.sessions.base_session_service))

import google.adk.memory.base_memory_service
print("base_memory_service:", dir(google.adk.memory.base_memory_service))

# Let's inspect the types of return annotations on BaseSessionService.list_sessions
from google.adk.sessions.base_session_service import BaseSessionService
import inspect
sig = inspect.signature(BaseSessionService.list_sessions)
print("list_sessions return type annotation:", sig.return_annotation)

from google.adk.memory.base_memory_service import BaseMemoryService
sig_search = inspect.signature(BaseMemoryService.search_memory)
print("search_memory return type annotation:", sig_search.return_annotation)
