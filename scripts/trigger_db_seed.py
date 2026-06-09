import urllib.request
import json
import os

import subprocess

url = "https://fahem-agent-1061555578804.us-east4.run.app/admin/seed-db"
token = os.environ.get("FAHEM_AUTH_TOKEN")
if not token:
    print("FAHEM_AUTH_TOKEN env var not found. Attempting to fetch OIDC Identity Token using gcloud...")
    try:
        token = subprocess.check_output(["gcloud", "auth", "print-identity-token"], shell=True).decode().strip()
        print(f"Successfully retrieved token (length: {len(token)}).")
    except Exception as e:
        print(f"Error retrieving OIDC token using gcloud: {e}")
        token = "YOUR_FAHEM_AUTH_TOKEN"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}",
    "X-Verified-Principal": json.dumps({
        "uid": "fDtKpvuKYuSgB3km8DRTRgOU3RH3",
        "email": "hesham1988@gmail.com",
        "role": "super-admin",
        "db_target": "fahem_sandbox"
    })
}

req = urllib.request.Request(url, data=b"{}", headers=headers, method="POST")

print(f"Triggering database seed at {url}...")
try:
    with urllib.request.urlopen(req, timeout=240.0) as response:
        status_code = response.getcode()
        body = response.read().decode("utf-8")
        print(f"Status Code: {status_code}")
        print("Response Body:")
        try:
            parsed = json.loads(body)
            print(json.dumps(parsed, indent=2, ensure_ascii=False))
        except Exception:
            print(body)
except Exception as e:
    print(f"Error triggering database seed: {e}")
