import subprocess
import httpx
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

cloud_run_url = "https://fahem-agent-1061555578804.us-east4.run.app"
url = f"{cloud_run_url}/user/list"

# Fetch OIDC token
token = subprocess.check_output(["gcloud", "auth", "print-identity-token"], shell=True).decode().strip()

headers = {
    "Accept": "application/json",
    "Authorization": f"Bearer {token}"
}

print("Querying Cloud Run user list...")
try:
    res = httpx.get(url, headers=headers, timeout=15.0)
    print("Status code:", res.status_code)
    try:
        data = res.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
    except Exception as e:
        print("Response text:", res.text)
except Exception as e:
    print("Failed to query:", e)
