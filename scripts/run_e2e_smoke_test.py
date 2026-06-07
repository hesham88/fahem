#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Fahem E2E Smoke Test and Gate Enforcer.
Authenticates as the super-admin user 'hesham1988@gmail.com' and performs
the mandatory verification checks outlined in R4:
1. Verify admin/superadmin tabs / admin check returns isAdmin: true.
2. Verify profile endpoint loads correctly.
3. Verify Knowledge Library lists >= 1 book.
4. Verify companion replies successfully (no 401, no safety block).
5. Verify normal user or unauthenticated request fails closed on administrative routes.
"""

import os
import json
import sys
import subprocess
import urllib.request
import urllib.error

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# We target the primary deployed service URL
BACKEND_URL = "https://fahem-agent-sbqsl5tfga-uk.a.run.app"

def safe_print(*args, **kwargs):
    try:
        print(*args, **kwargs)
    except UnicodeEncodeError:
        new_args = []
        for arg in args:
            if isinstance(arg, str):
                new_args.append(arg.encode('ascii', errors='replace').decode('ascii'))
            else:
                new_args.append(arg)
        try:
            print(*new_args, **kwargs)
        except Exception:
            pass

def get_oidc_token():
    print("[SMOKE TEST] Fetching OIDC Identity Token using gcloud...")
    try:
        token = subprocess.check_output(["gcloud", "auth", "print-identity-token"], shell=True).decode().strip()
        print(f"[SMOKE TEST] Successfully retrieved token (length: {len(token)}).")
        return token
    except Exception as e:
        print(f"[SMOKE TEST][-] Error retrieving OIDC token: {e}")
        return None

def make_request(url, method="GET", headers=None, body=None):
    if headers is None:
        headers = {}
    
    data = None
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
        
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30.0) as resp:
            return resp.getcode(), json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as he:
        try:
            err_body = he.read().decode("utf-8")
            return he.code, err_body
        except Exception:
            return he.code, None
    except Exception as err:
        return 0, str(err)

def run_smoke_test():
    print("==================================================")
    print("[SMOKE TEST] Initiating Deployed E2E Smoke Test Gate (R4)")
    print("==================================================")
    
    token = get_oidc_token()
    if not token:
        print("[SMOKE TEST][FAIL] Authentication token is missing. Ensure you are logged into gcloud.")
        sys.exit(1)
        
    auth_header = {"Authorization": f"Bearer {token}"}
    all_passed = True
    
    # --- Check 1: Super-admin check (/admin/check) ---
    print("\n[SMOKE TEST][1/5] Verifying Super-admin Check Endpoint...")
    check_url = f"{BACKEND_URL}/admin/check?email=hesham1988@gmail.com"
    code, res = make_request(check_url, headers=auth_header)
    print(f"Status Code: {code}")
    safe_print(f"Payload: {res}")
    if code == 200 and isinstance(res, dict) and res.get("isAdmin") is True:
        print("[SMOKE TEST][PASS] Admin check passed successfully!")
    else:
        print("[SMOKE TEST][FAIL] Super-admin check failed!")
        all_passed = False
        
    # --- Check 2: Profile Loads (/user/profile) ---
    print("\n[SMOKE TEST][2/5] Verifying User Profile Loading...")
    profile_url = f"{BACKEND_URL}/user/profile"
    # We must pass X-Verified-Principal as the Next.js auth middleware would
    principal_header = {
        **auth_header,
        "X-Verified-Principal": json.dumps({
            "uid": "fDtKpvuKYuSgB3km8DRTRgOU3RH3",
            "email": "hesham1988@gmail.com",
            "role": "super-admin"
        })
    }
    code, res = make_request(profile_url, headers=principal_header)
    print(f"Status Code: {code}")
    safe_print(f"Payload: {res}")
    if code == 200 and isinstance(res, dict) and "profile" in res and "email" in res["profile"]:
        print("[SMOKE TEST][PASS] User profile loads correctly!")
    else:
        print("[SMOKE TEST][FAIL] User profile loading failed!")
        all_passed = False
        
    # --- Check 3: Knowledge Library Lists >= 1 Book (/user/books) ---
    print("\n[SMOKE TEST][3/5] Verifying Knowledge Library Books List...")
    books_url = f"{BACKEND_URL}/user/books"
    code, res = make_request(books_url, headers=principal_header)
    print(f"Status Code: {code}")
    if code == 200:
        books_list = res if isinstance(res, list) else res.get("books", [])
        print(f"Books Found Count: {len(books_list)}")
        if len(books_list) >= 1:
            print("[SMOKE TEST][PASS] Knowledge Library lists books correctly!")
        else:
            print("[SMOKE TEST][FAIL] Zero books returned from library!")
            all_passed = False
    else:
        safe_print(f"[SMOKE TEST][FAIL] Failed to retrieve library books. Response: {res}")
        all_passed = False
        
    # --- Check 4: Companion replies to 'hi' (/run) ---
    print("\n[SMOKE TEST][4/5] Verifying Companion Chat Response...")
    run_url = f"{BACKEND_URL}/run"
    chat_payload = {
        "user_id": "cli_user",
        "session_id": "smoke_test_session",
        "app_name": "app",
        "new_message": {
            "role": "user",
            "parts": [{"text": "hi"}]
        },
        "streaming": False
    }
    code, res = make_request(run_url, method="POST", headers=auth_header, body=chat_payload)
    print(f"Status Code: {code}")
    if code == 200 and isinstance(res, list) and len(res) > 0:
        response_text = ""
        content = res[0].get("content")
        if content and "parts" in content:
            response_text = "".join([p.get("text", "") for p in content["parts"]])
        
        safe_print(f"Companion Response: '{response_text}'")
        if response_text and "DENIED" not in response_text and "Safety policy violation" not in response_text:
            print("[SMOKE TEST][PASS] Companion chat behaves correctly!")
        else:
            print("[SMOKE TEST][FAIL] Companion chat returned empty or blocked message!")
            all_passed = False
    else:
        safe_print(f"[SMOKE TEST][FAIL] Chat invocation failed. Response: {res}")
        all_passed = False
        
    # --- Check 5: Security / Fail-Closed Checks ---
    print("\n[SMOKE TEST][5/5] Checking Fail-Closed Security Gating...")
    # Unauthenticated call to sync-db
    sync_url = f"{BACKEND_URL}/admin/sync-db"
    code, res = make_request(sync_url, method="POST", body={})
    print(f"Unauthenticated /admin/sync-db -> Status Code: {code}")
    if code in (401, 403):
        print("[SMOKE TEST][PASS] Fail-closed gating blocked unauthenticated access correctly.")
    else:
        print(f"[SMOKE TEST][FAIL] Fail-closed gating permitted unauthenticated access! Code: {code}")
        all_passed = False
        
    print("\n==================================================")
    if all_passed:
        print("[SMOKE TEST][SUCCESS] ALL R4 E2E GATES PASSED!")
        print("==================================================")
        return True
    else:
        print("[SMOKE TEST][FAILURE] ONE OR MORE R4 SMOKE TEST CHECKS FAILED.")
        print("==================================================")
        return False

if __name__ == "__main__":
    success = run_smoke_test()
    if not success:
        sys.exit(1)
