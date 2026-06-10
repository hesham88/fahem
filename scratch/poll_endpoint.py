import urllib.request
import urllib.error
import time
import sys

url = "https://fahem.pro/api/admin/emergency-sandbox-purge"
req = urllib.request.Request(url, method="POST")

print("Polling starting...")
for i in range(1, 61):
    try:
        urllib.request.urlopen(req, timeout=10)
        print(f"[{i}] Success 200")
        sys.exit(0)
    except urllib.error.HTTPError as e:
        print(f"[{i}] HTTP Error: {e.code}")
        if e.code == 401:
            print("Found 401! Route is deployed and requires auth!")
            sys.exit(0)
    except Exception as e:
        print(f"[{i}] Error: {e}")
    time.sleep(10)

print("Timeout reached")
sys.exit(1)
