import sys
import os

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
    print(f"get_tools() returned {len(tools)} tools:")
    for t in tools:
        print(f"  Name: {t.name}, Type: {type(t)}")
        print("  Dir of t:", [x for x in dir(t) if not x.startswith('_')])
        break
        
    list_collections_tool = None
    for t in tools:
        if t.name == "list-collections":
            list_collections_tool = t
            break
            
    if list_collections_tool:
        print("\nFound list-collections!")
        import inspect
        print("run_async signature:", inspect.signature(list_collections_tool.run_async))
        
        # Let's try calling run_async with None or an empty dict as tool_context
        try:
            print("Running list-collections with tool_context=None...")
            res = await list_collections_tool.run_async(args={"database": "fahem"}, tool_context=None)
            print("Run result with None:", res)
        except Exception as e:
            print("Run with None failed:", e)
            
            # If that failed, let's try importing ToolContext
            try:
                from google.adk.tools.base_tool import ToolContext
                print("ToolContext class:", ToolContext)
                print("ToolContext __init__ signature:", inspect.signature(ToolContext.__init__))
                
                # Check if it's a Pydantic model
                from pydantic import BaseModel
                if issubclass(ToolContext, BaseModel):
                    print("ToolContext is a Pydantic BaseModel")
                    print("fields:", ToolContext.model_fields.keys() if hasattr(ToolContext, "model_fields") else ToolContext.__fields__.keys())
                    # Let's see what are the required fields
                    # Let's build it with a mock/dummy session or similar
                    tc = ToolContext(user_id="cli_user", session_id="test_session")
                else:
                    tc = ToolContext(user_id="cli_user", session_id="test_session")
                print("Created ToolContext:", tc)
                res = await list_collections_tool.run_async(args={"database": "fahem"}, tool_context=tc)
                print("Run result with ToolContext:", res)
            except Exception as e2:
                print("Run with ToolContext failed:", e2)

import asyncio
try:
    asyncio.run(test_run())
except Exception as e:
    print("Asyncio run failed:", e)
