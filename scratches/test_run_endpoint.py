import httpx
import json
import sys
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

cloud_run_url = "https://fahem-agent-sbqsl5tfga-uk.a.run.app"
url = f"{cloud_run_url}/run"

token = os.environ.get("FAHEM_AUTH_TOKEN", "YOUR_FAHEM_AUTH_TOKEN")

headers = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
}

payload = {
    "user_id": "test_user_id_gemini_2026",
    "session_id": "fahem_microservice_session",
    "app_name": "app",
    "new_message": {
        "role": "user",
        "parts": [{"text": "Hello, listing databases"}]
    },
    "streaming": False
}

print("Querying Cloud Run /run...")
try:
    res = httpx.post(url, headers=headers, json=payload, timeout=20.0)
    print("Status code:", res.status_code)
    try:
        data = res.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
    except Exception:
        print("Response text:", res.text)
except Exception as e:
    print("Failed to query:", e)
