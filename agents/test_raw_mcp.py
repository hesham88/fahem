import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_mcp_with_raw_uri():
    from mongodb_agent.agent import mcp_toolset
    tools = await mcp_toolset.get_tools()
    tools_map = {t.name: t for t in tools}
    
    raw_uri = os.environ.get("MONGODB_URI")
    if not raw_uri:
        print("Error: MONGODB_URI environment variable is not set. Please set it before running this test script.")
        return
    
    print("Testing connect with RAW SRV URI...")
    try:
        res = await tools_map["connect"].run_async(
            args={"connectionStringOrClusterName": raw_uri},
            tool_context=None
        )
        print("Connect result:", res)
        
        print("\nTesting find with RAW SRV URI...")
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
        print("Failed with RAW SRV URI:", e)

if __name__ == "__main__":
    asyncio.run(test_mcp_with_raw_uri())
