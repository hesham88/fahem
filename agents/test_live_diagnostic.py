import httpx
import json
import sys

# Reconfigure stdout to use utf-8 to avoid encoding errors with emojis
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

cloud_run_url = "https://fahem-agent-sbqsl5tfga-uk.a.run.app"
url = f"{cloud_run_url}/db-diagnostic"

headers = {
    "Accept": "application/json",
    "Authorization": "Bearer LOCAL_BYPASS_TOKEN_fahem_2026"
}

print("Querying Cloud Run db-diagnostic...")
try:
    res = httpx.get(url, headers=headers, timeout=15.0)
    print("Status code:", res.status_code)
    try:
        data = res.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
    except Exception:
        print("Response text:", res.text)
except Exception as e:
    print("Failed to query:", e)
