import urllib.request
import json

url = "https://fahem-agent-sbqsl5tfga-uk.a.run.app/admin/seed-db"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer LOCAL_BYPASS_TOKEN_fahem_2026"
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
