import urllib.request
import json
import os

url = "https://fahem-agent-sbqsl5tfga-uk.a.run.app/admin/seed-db"
token = os.environ.get("FAHEM_AUTH_TOKEN", "YOUR_FAHEM_AUTH_TOKEN")
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
}

req = urllib.request.Request(url, data=b"{}", headers=headers, method="POST")

print(f"Triggering database seed at {url}...")
try:
    with urllib.request.urlopen(req, timeout=30.0) as response:
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
