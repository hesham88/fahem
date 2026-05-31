import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_mcp_with_resolved_uri():
    from mongodb_agent.agent import mcp_toolset
    from tools import get_mongodb_uri
    tools = await mcp_toolset.get_tools()
    tools_map = {t.name: t for t in tools}
    
    resolved_uri = get_mongodb_uri()
    print("Resolved URI being tested:", resolved_uri)
    
    print("\nTesting connect with RESOLVED URI...")
    try:
        res = await tools_map["connect"].run_async(
            args={"connectionString": resolved_uri},
            tool_context=None
        )
        print("Connect result:", res)
        
        print("\nTesting find with RESOLVED URI...")
        find_res = await tools_map["find"].run_async(
            args={
                "database": "fahem",
                "collection": "users",
                "filter": {"userId": "test_user_id_123"}
            },
            tool_context=None
        )
        print("Find result:", find_res)
    except Exception as e:
        print("Failed with RESOLVED URI:", e)

if __name__ == "__main__":
    asyncio.run(test_mcp_with_resolved_uri())
