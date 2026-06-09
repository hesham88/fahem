#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Synchronizes the local migrated database structures (libraries, curricula, subjects, books)
to the production MongoDB Atlas instance via the secure administrative gated endpoint /admin/sync-db.
"""

import os
import json
import sys
import subprocess
import urllib.request
import urllib.error

LOCAL_DB_PATH = "C:/Users/hesh1/Desktop/fahem/web/src/app/api/local_db.json"
BACKEND_URL = "https://fahem-agent-1061555578804.us-east4.run.app"

def get_oidc_token():
    print("[SYNC] Fetching OIDC Identity Token using gcloud...")
    try:
        token = subprocess.check_output(["gcloud", "auth", "print-identity-token"], shell=True).decode().strip()
        print(f"[SYNC] Successfully retrieved OIDC token (length: {len(token)}).")
        return token
    except Exception as e:
        print(f"[SYNC][-] Error retrieving OIDC token: {e}")
        return None

def make_request(url, method="POST", headers=None, body=None):
    if headers is None:
        headers = {}
    
    data = None
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
        
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120.0) as resp:
            return resp.getcode(), json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as he:
        try:
            err_body = he.read().decode("utf-8")
            return he.code, err_body
        except Exception:
            return he.code, None
    except Exception as err:
        return 0, str(err)

def main():
    print("==================================================")
    print("[SYNC] Starting Local-to-Production Sync for R3 Data")
    print("==================================================")
    
    if not os.path.exists(LOCAL_DB_PATH):
        print(f"[SYNC][FAIL] Local database file not found at: {LOCAL_DB_PATH}")
        sys.exit(1)
        
    token = get_oidc_token()
    if not token:
        print("[SYNC][FAIL] Authentication token is missing. Ensure you are logged into gcloud.")
        sys.exit(1)
        
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"[SYNC] Reading local database from {LOCAL_DB_PATH}...")
    with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
        db = json.load(f)
        
    # We must synchronize: libraries, curricula, subjects, books
    payload = {
        "libraries": db.get("libraries", []),
        "curricula": db.get("curricula", []),
        "subjects": db.get("subjects", []),
        "books": db.get("books", []),
        "users": db.get("users", []),
        "admins": db.get("admins", []),
        "force": True
    }
    
    print(f"[SYNC] Local data counts:")
    print(f"  - Libraries: {len(payload['libraries'])}")
    print(f"  - Curricula: {len(payload['curricula'])}")
    print(f"  - Subjects:  {len(payload['subjects'])}")
    print(f"  - Books:     {len(payload['books'])}")
    print(f"  - Users:     {len(payload['users'])}")
    print(f"  - Admins:    {len(payload['admins'])}")
    
    sync_url = f"{BACKEND_URL}/admin/sync-db"
    print(f"[SYNC] POSTing sync payload to {sync_url}...")
    
    code, res = make_request(sync_url, method="POST", headers=headers, body=payload)
    print(f"Status Code: {code}")
    print(f"Response: {res}")
    
    if code == 200 and isinstance(res, dict) and res.get("status") == "success":
        print("[SYNC][SUCCESS] Database synchronized successfully to production MongoDB Atlas!")
    else:
        print("[SYNC][FAIL] Database synchronization failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
