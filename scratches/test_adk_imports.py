import sys
try:
    import google.adk
    print("google.adk imported successfully")
    print(dir(google.adk))
except ImportError as e:
    print("google.adk import failed:", e)

try:
    from google.adk import tool
    print("tool decorator imported from google.adk")
except ImportError as e:
    print("from google.adk import tool failed:", e)

try:
    from google.adk.tools import tool
    print("tool decorator imported from google.adk.tools")
except ImportError as e:
    print("from google.adk.tools import tool failed:", e)
