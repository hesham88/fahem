#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Fahem Database Sync Script.
Reads local_db.json and securely sends all collections and documents to the 
production Cloud Run API to sync/upsert them directly into the live MongoDB database.
"""

import os
import json
import urllib.request
import urllib.error
import subprocess

# Resolve paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
LOCAL_DB_PATH = os.path.join(ROOT_DIR, "web", "src", "app", "api", "local_db.json")

# Support both candidate URLs
PROD_URLS = [
    "https://fahem-agent-sbqsl5tfga-uk.a.run.app/admin/sync-db",
    "https://fahem-agent-1061555578804.us-east4.run.app/admin/sync-db"
]

def get_auth_token():
    token = os.environ.get('FAHEM_AUTH_TOKEN')
    if token:
        print("[*] Using FAHEM_AUTH_TOKEN from environment.")
        return f"Bearer {token}"
    
    print("[*] FAHEM_AUTH_TOKEN environment variable not found. Attempting to fetch identity token using gcloud...")
    try:
        token = subprocess.check_output(["gcloud", "auth", "print-identity-token"], shell=True).decode().strip()
        print("[+] Successfully fetched identity token using gcloud.")
        return f"Bearer {token}"
    except Exception as e:
        print(f"[-] Error fetching identity token: {e}")
        return "Bearer YOUR_FAHEM_AUTH_TOKEN"

def sync_local_to_production():
    print("--------------------------------------------------")
    print("[SYNC] Fahem Database Synchronizer (Local -> Production Live)")
    print("--------------------------------------------------")
    
    if not os.path.exists(LOCAL_DB_PATH):
        print(f"[-] Error: Local database file not found at: {LOCAL_DB_PATH}")
        return False
        
    print(f"[*] Reading local database state from: {LOCAL_DB_PATH}")
    try:
        with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
            local_db = json.load(f)
    except Exception as e:
        print(f"[-] Error: Failed to parse local_db.json: {e}")
        return False

    print(f"[*] Local collections found: {list(local_db.keys())}")
    for col, docs in local_db.items():
        if isinstance(docs, list):
            print(f"   * Collection '{col}': {len(docs)} documents")
            
    bypass_token = get_auth_token()
    payload_data = json.dumps(local_db, ensure_ascii=False).encode("utf-8")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": bypass_token
    }
    
    success = True
    for prod_url in PROD_URLS:
        print(f"\n[+] Sending sync payload to production API: {prod_url}...")
        
        req = urllib.request.Request(
            prod_url,
            data=payload_data,
            headers=headers,
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req, timeout=60.0) as response:
                status_code = response.getcode()
                response_body = response.read().decode("utf-8")
                
                print(f"[OK] Status Code: {status_code}")
                try:
                    parsed_res = json.loads(response_body)
                    print(f"[SUCCESS] Sync Complete for {prod_url}! Production Response:")
                    print(json.dumps(parsed_res, indent=2, ensure_ascii=False))
                except Exception:
                    print(f"\nResponse Body: {response_body}")
                    
        except urllib.error.HTTPError as he:
            print(f"[ERROR] HTTP Error {he.code}: {he.reason} for {prod_url}")
            try:
                err_body = he.read().decode("utf-8")
                print(f"   Error Body: {err_body}")
            except Exception:
                pass
            success = False
        except Exception as err:
            print(f"[ERROR] Error triggering database synchronization for {prod_url}: {err}")
            success = False
            
    return success

if __name__ == "__main__":
    sync_local_to_production()
