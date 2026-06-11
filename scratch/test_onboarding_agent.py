import urllib.request
import json

payload = {
    "app_name": "onboarding_agent",
    "user_id": "test_user_onboarding",
    "session_id": "onboarding_session_test_user_onboarding",
    "new_message": {
        "role": "user",
        "parts": [{"text": "[SYSTEM] Phone number verified: +201012345678"}]
    },
    "streaming": True
}

headers = {
    "Content-Type": "application/json",
    "X-Verified-Principal": json.dumps({
        "uid": "test_user_onboarding",
        "email": "test_onboarding@gmail.com",
        "role": "student",
        "db_target": "fahem_sandbox"
    })
}

req = urllib.request.Request(
    "http://localhost:8000/run_sse",
    data=json.dumps(payload).encode("utf-8"),
    headers=headers,
    method="POST"
)

try:
    print("Connecting to local run_sse...")
    with urllib.request.urlopen(req, timeout=15) as resp:
        print("Status:", resp.status)
        for line in resp:
            decoded = line.decode("utf-8").strip()
            if decoded:
                print(decoded)
except Exception as e:
    print("Error:", e)
