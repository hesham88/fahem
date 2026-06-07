import sys
import os

# Reconfigure stdout to use utf-8 to avoid encoding errors
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

print("Inspecting responses and memory entries...")

try:
    from google.adk.sessions import ListSessionsResponse
    print("ListSessionsResponse fields:")
    for name, field in ListSessionsResponse.model_fields.items():
        print(f"  {name}: {field.annotation} (default: {field.default})")
except Exception as e:
    print("Error with ListSessionsResponse:", e)

try:
    from google.adk.memory import SearchMemoryResponse, MemoryEntry
    print("\nSearchMemoryResponse fields:")
    for name, field in SearchMemoryResponse.model_fields.items():
        print(f"  {name}: {field.annotation} (default: {field.default})")
    print("\nMemoryEntry fields:")
    for name, field in MemoryEntry.model_fields.items():
        print(f"  {name}: {field.annotation} (default: {field.default})")
except Exception as e:
    print("Error with MemoryEntry/SearchMemoryResponse:", e)
