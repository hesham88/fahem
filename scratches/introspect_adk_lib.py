import sys
import os
import inspect

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
    if tools:
        t = tools[0]
        base_class = type(t).__bases__[0]
        print("Base class:", base_class)
        try:
            print("=== Source Code ===")
            print(inspect.getsource(base_class))
        except Exception as e:
            print("Could not get source:", e)

try:
    import asyncio
    asyncio.run(test_run())
except Exception as e:
    print("Error:", e)
