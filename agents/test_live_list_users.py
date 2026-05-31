import httpx
import json

cloud_run_url = "https://fahem-agent-sbqsl5tfga-uk.a.run.app"
url = f"{cloud_run_url}/user/list"

headers = {
    "Accept": "application/json",
    "Authorization": "Bearer LOCAL_BYPASS_TOKEN_fahem_2026"
}

print("Querying Cloud Run user list...")
try:
    res = httpx.get(url, headers=headers, timeout=15.0)
    print("Status code:", res.status_code)
    try:
        data = res.json()
        with open("users_list_output.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print("Successfully wrote response to users_list_output.json")
    except Exception as e:
        print("Response was not valid JSON or failed to write file:", e)
        print("Response text:", res.text)
except Exception as e:
    print("Failed to query:", e)

