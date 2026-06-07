import urllib.request
import urllib.error
import subprocess
import sys

# Get identity token
try:
    token = subprocess.check_output(["gcloud", "auth", "print-identity-token"], shell=True).decode().strip()
    print("Obtained identity token!")
except Exception as e:
    print("Failed to get token:", e)
    token = None

urls = [
    "https://fahem-agent-sbqsl5tfga-uk.a.run.app",
    "https://fahem-agent-1061555578804.us-east4.run.app"
]

for url in urls:
    print(f"\nTesting URL: {url}")
    # First test root or check with no auth
    req = urllib.request.Request(f"{url}/admin/check")
    try:
        urllib.request.urlopen(req)
        print(" -> check without auth: 200 (unexpected)")
    except urllib.error.HTTPError as e:
        print(f" -> check without auth: {e.code}")
    except Exception as e:
        print(f" -> check without auth failed: {e}")

    # Now test check with auth
    if token:
        req = urllib.request.Request(f"{url}/admin/check?email=hesham1988@gmail.com")
        req.add_header("Authorization", f"Bearer {token}")
        try:
            with urllib.request.urlopen(req) as resp:
                print(f" -> check with auth: {resp.getcode()}")
                print(f"    response: {resp.read().decode()}")
        except urllib.error.HTTPError as e:
            print(f" -> check with auth: {e.code}")
            try:
                print(f"    body: {e.read().decode()}")
            except Exception:
                pass
        except Exception as e:
            print(f" -> check with auth failed: {e}")
