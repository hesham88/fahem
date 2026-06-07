import sys
import os

# Reconfigure stdout to use utf-8 to avoid encoding errors
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from google.adk.sessions.base_session_service import ListSessionsResponse, GetSessionConfig
from google.adk.memory.base_memory_service import SearchMemoryResponse, MemoryEntry

print("ListSessionsResponse fields:")
for name, field in ListSessionsResponse.model_fields.items():
    print(f"  {name}: {field.annotation} (default: {field.default})")

print("\nGetSessionConfig fields:")
for name, field in GetSessionConfig.model_fields.items():
    print(f"  {name}: {field.annotation} (default: {field.default})")

print("\nSearchMemoryResponse fields:")
for name, field in SearchMemoryResponse.model_fields.items():
    print(f"  {name}: {field.annotation} (default: {field.default})")

print("\nMemoryEntry fields:")
for name, field in MemoryEntry.model_fields.items():
    print(f"  {name}: {field.annotation} (default: {field.default})")
