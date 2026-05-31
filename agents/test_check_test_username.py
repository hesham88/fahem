import httpx
import json

cloud_run_url = "https://fahem-agent-sbqsl5tfga-uk.a.run.app"

headers = {
    "Accept": "application/json",
    "Authorization": "Bearer LOCAL_BYPASS_TOKEN_fahem_2026"
}

async def run_checks():
    async with httpx.AsyncClient(timeout=15.0) as client:
        # Check existing username 'test_user_gemini'
        res1 = await client.get(f"{cloud_run_url}/user/username/check?username=test_user_gemini", headers=headers)
        print("Check existing 'test_user_gemini':", res1.status_code, res1.text)
        
        # Check existing username 'hesham88'
        res1_b = await client.get(f"{cloud_run_url}/user/username/check?username=hesham88", headers=headers)
        print("Check existing 'hesham88':", res1_b.status_code, res1_b.text)
        
        # Check case insensitivity
        res2 = await client.get(f"{cloud_run_url}/user/username/check?username=HESHAM88", headers=headers)
        print("Check case-insensitive 'HESHAM88':", res2.status_code, res2.text)
        
        # Check nonexistent username
        res3 = await client.get(f"{cloud_run_url}/user/username/check?username=nonexistent_username_xyz", headers=headers)
        print("Check nonexistent:", res3.status_code, res3.text)

import asyncio
asyncio.run(run_checks())
