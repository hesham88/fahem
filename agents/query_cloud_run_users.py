import httpx
import json

url = "https://fahem-agent-sbqsl5tfga-uk.a.run.app/user/list"
print("Querying Cloud Run user list...")
try:
    res = httpx.get(url, timeout=10.0)
    print("Status code:", res.status_code)
    try:
        print(json.dumps(res.json(), indent=2))
    except Exception:
        print("Response text:", res.text)
except Exception as e:
    print("Failed to query:", e)
