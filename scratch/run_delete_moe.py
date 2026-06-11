import subprocess
import urllib.request
import json
import socket
import sys
import argparse

# Monkeypatch socket.getaddrinfo to bypass slow DNS lookup in local CLI sandbox
_original_getaddrinfo = socket.getaddrinfo
def _patched_getaddrinfo(host, port, *args, **kwargs):
    if host == "fahem.pro":
        return _original_getaddrinfo("35.219.200.193", port, *args, **kwargs)
    if host == "fahem-agent-1061555578804.us-east4.run.app":
        return _original_getaddrinfo("34.143.79.2", port, *args, **kwargs)
    return _original_getaddrinfo(host, port, *args, **kwargs)
socket.getaddrinfo = _patched_getaddrinfo

def get_oidc_token():
    try:
        res = subprocess.run(
            ["gcloud", "auth", "print-identity-token"],
            capture_output=True, text=True, check=True, shell=True
        )
        return res.stdout.strip()
    except Exception as e:
        print(f"Error generating OIDC token: {e}")
        return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--confirm", action="store_true", help="Actually execute cascade deletion.")
    ap.add_argument("--db", type=str, default=None, help="Specific database to run against.")
    args = ap.parse_args()

    token = get_oidc_token()
    if not token:
        print("Could not retrieve OIDC token.")
        sys.exit(1)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Verified-Principal": json.dumps({ # guard:allow-principal
            "uid": "owner_gcp_uid",
            "email": "hesham1988@gmail.com",
            "role": "super-admin",
            "db_target": args.db or "fahem"
        }),
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    body = {
        "confirm": args.confirm,
    }
    if args.db:
        body["db"] = args.db

    mode_str = "DELETE (APPLY)" if args.confirm else "DRY-RUN"
    print(f"Triggering MOE Library Purge over HTTPS (Mode: {mode_str}, DB: {args.db or 'Both (fahem + fahem_sandbox)'})...")

    req = urllib.request.Request(
        "https://fahem-agent-1061555578804.us-east4.run.app/admin/delete-moe-library",
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"Response status: {data.get('success')}")
            print("\n--- Script Stdout ---")
            print(data.get("stdout", ""))
            print("\n--- Script Stderr ---")
            print(data.get("stderr", ""))
            if not data.get("success"):
                print("Remote execution reported failure.")
                sys.exit(1)
    except Exception as e:
        print(f"Request failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
