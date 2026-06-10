import urllib.request
import json
import time

url = "https://fahem.pro/api/version"
target_sha = "30e2cd0"

print(f"Polling {url} for target SHA {target_sha}...")
for i in range(30):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Fahem-Poll"})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
            current_sha = data.get("sha") or data.get("git_sha") or data.get("version") or str(data)
            print(f"[{i+1}/30] Current version/SHA on fahem.pro: {current_sha}")
            if target_sha in str(current_sha):
                print("SUCCESS: Target deployment is now live!")
                break
    except Exception as e:
        print(f"[{i+1}/30] Failed to fetch: {e}")
    time.sleep(15)
