import sys
import os
import asyncio

sys.path.append(r"C:\Users\hesh1\Desktop\fahem\agents")

# Preload local config
try:
    with open(r"C:\Users\hesh1\Desktop\fahem\web\.env.local", "r") as f:
        for line in f:
            if "=" in line and not line.strip().startswith("#"):
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key not in os.environ:
                    os.environ[key] = val
except Exception:
    pass

from mongodb_agent.agent import mcp_toolset

async def test_run():
    tools = await mcp_toolset.get_tools()
    tools_map = {t.name: t for t in tools}
    
    target_tools = ["connect", "list-databases", "list-collections", "db-stats", "collection-schema", "find", "insert-one"]
    for name in target_tools:
        if name in tools_map:
            t = tools_map[name]
            print(f"=== Tool: {t.name} ===")
            print(f"Description: {t.description}")
            # Let's see if t has raw_mcp_tool
            if hasattr(t, "raw_mcp_tool"):
                raw = t.raw_mcp_tool
                print("Input Schema:", getattr(raw, "inputSchema", "No input schema"))
            print()

try:
    asyncio.run(test_run())
except Exception as e:
    print("Asyncio run failed:", e)
