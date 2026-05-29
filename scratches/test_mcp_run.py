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
    print("Awaiting get_tools()...")
    tools = await mcp_toolset.get_tools()
    
    # Let's map tools by name
    tools_map = {t.name: t for t in tools}
    print("Available tools:", list(tools_map.keys()))
    
    # 1. Connect
    if "connect" in tools_map:
        print("Running connect...")
        try:
            # Check if connect requires arguments. Let's see
            res = await tools_map["connect"].run_async(args={}, tool_context=None)
            print("Connect response:", res)
        except Exception as e:
            print("Connect failed:", e)
            
    # 2. List databases
    if "list-databases" in tools_map:
        print("Running list-databases...")
        try:
            res = await tools_map["list-databases"].run_async(args={}, tool_context=None)
            print("List databases response:", res)
        except Exception as e:
            print("List databases failed:", e)

    # 3. List collections
    if "list-collections" in tools_map:
        print("Running list-collections for database 'fahem'...")
        try:
            res = await tools_map["list-collections"].run_async(args={"database": "fahem"}, tool_context=None)
            print("List collections response:", res)
        except Exception as e:
            print("List collections failed:", e)

    # 4. db-stats
    if "db-stats" in tools_map:
        print("Running db-stats for database 'fahem'...")
        try:
            res = await tools_map["db-stats"].run_async(args={"database": "fahem"}, tool_context=None)
            print("db-stats response:", res)
        except Exception as e:
            print("db-stats failed:", e)

try:
    asyncio.run(test_run())
except Exception as e:
    print("Asyncio run failed:", e)
