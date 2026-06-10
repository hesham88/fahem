#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import json
import urllib.request
import urllib.error

BASE_URL = "https://fahem.pro"

def main():
    print("==========================================================")
    print("       TRIGGER EMERGENCY PROD SANDBOX PURGE via API       ")
    print("==========================================================")

    # Step 1: Request admin persona demo token
    print(f"\n[1/3] Requesting Admin Persona Demo Token from {BASE_URL}...")
    enter_url = f"{BASE_URL}/api/demo/enter"
    payload = {"persona": "admin"}
    
    req = urllib.request.Request(
        enter_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "Fahem-Purge-Trigger"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            token = data.get("token")
            if not token:
                print("[-] Error: No token returned in response!")
                sys.exit(1)
            print(f"[+] Successfully obtained Admin Demo Token: {token[:25]}...")
    except Exception as e:
        print(f"[-] Failed to obtain admin token: {e}")
        sys.exit(1)

    # Step 2: Call the Next.js API endpoint to execute the purge
    print(f"\n[2/3] Triggering Emergency Purge via /api/admin/emergency-sandbox-purge...")
    purge_url = f"{BASE_URL}/api/admin/emergency-sandbox-purge"
    purge_payload = {
        "apply": True,
        "clear_prod_jobs": True,
        "purge_prod_demo": True,
        "i_understand_prod_delete": True
    }
    
    req_purge = urllib.request.Request(
        purge_url,
        data=json.dumps(purge_payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "User-Agent": "Fahem-Purge-Trigger"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req_purge, timeout=90) as resp_purge:
            result = json.loads(resp_purge.read().decode("utf-8"))
            print("[+] Purge API Call completed successfully!")
            
            # Step 3: Print execution results
            print("\n[3/3] Execution Results:")
            print(f"  - success: {result.get('success')}")
            print(f"  - returncode: {result.get('returncode')}")
            print("\n--- Python Purge Script Stdout ---")
            print(result.get("stdout", "No stdout returned"))
            print("\n--- Python Purge Script Stderr ---")
            print(result.get("stderr", "No stderr returned"))
            
    except urllib.error.HTTPError as he:
        print(f"[-] HTTP Error {he.code}: {he.reason}")
        try:
            err_data = he.read().decode("utf-8")
            print(f"Details: {err_data}")
        except Exception:
            pass
        sys.exit(1)
    except Exception as e:
        print(f"[-] Purge trigger failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
