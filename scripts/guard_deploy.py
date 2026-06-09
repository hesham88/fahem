#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import json
import urllib.request
import subprocess

# Ensure UTF-8 printing
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass


def get_local_sha():
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"]).decode("utf-8").strip()
    except Exception as e:
        print(f"[DEPLOY][WARN] Failed to get local git SHA: {e}")
        return "unknown"

def fetch_json(url, name):
    print(f"[DEPLOY] Fetching {name} from {url}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Fahem-Bible-Guard"})
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"[DEPLOY][ERROR] Failed to fetch {name} from {url}: {e}")
        return None

def main():
    print("==================================================")
    print("[DEPLOY] Running Deploy Parity Check (G8)")
    print("==================================================")
    
    local_sha = get_local_sha().strip().replace("\ufeff", "")
    if local_sha == "unknown":
        print("[DEPLOY][ERROR] Cannot verify deploy parity without local git SHA.")
        sys.exit(1)
        
    print(f"[DEPLOY] Local expected HEAD SHA: {local_sha}")
    
    # Check if testing locally or prod
    use_local = "--local" in sys.argv
    first_deploy = "--first-deploy" in sys.argv
    
    if use_local:
        fe_url = "http://localhost:3000/api/version"
        be_url = "http://localhost:8000/health"
    else:
        fe_url = "https://fahem.pro/api/version"
        be_url = "https://fahem-agent-1061555578804.us-east4.run.app/health"
        
    allowed_shas = {local_sha}
    print(f"[DEPLOY] Allowed SHAs: {allowed_shas}")

    fe_data = fetch_json(fe_url, "Frontend Version")
    be_data = fetch_json(be_url, "Backend Health")
    
    failed = False
    
    if not fe_data:
        if first_deploy:
            print(f"[DEPLOY][WARN] Frontend version endpoint is unreachable. Continuing deployment because --first-deploy was provided.")
        else:
            print(f"[DEPLOY][FAIL] Frontend version endpoint is unreachable and --first-deploy was not specified.")
            failed = True
    else:
        fe_sha = fe_data.get("sha", "unknown").strip().replace("\ufeff", "")
        print(f"[DEPLOY] Deployed Frontend SHA: {fe_sha}")
        if fe_sha not in allowed_shas:
            print(f"[DEPLOY][FAIL] Frontend SHA mismatch! Live: {fe_sha} not in allowed set.")
            failed = True
        else:
            print("[DEPLOY][PASS] Frontend is up-to-date with HEAD.")
            
    if not be_data:
        print(f"[DEPLOY][FAIL] Backend health endpoint is unreachable.")
        failed = True
    else:
        be_sha = (be_data.get("sha") or be_data.get("commit", "unknown")).strip().replace("\ufeff", "")
        print(f"[DEPLOY] Deployed Backend SHA: {be_sha}")

        if be_sha not in allowed_shas:
            # We can allow 'local' or 'unknown' for local development bypass if not in production mode
            if use_local and be_sha in ["local", "unknown"]:
                print("[DEPLOY][WARN] Backend is running in local mode; bypassing SHA check.")
            else:
                print(f"[DEPLOY][FAIL] Backend SHA mismatch! Live: {be_sha} not in allowed set.")
                failed = True
        else:
            print("[DEPLOY][PASS] Backend is up-to-date with HEAD.")
            
    if failed:
        print("[DEPLOY][FAIL] Deploy parity check failed! Please ensure you build, push, and deploy both Frontend and Backend.")
        sys.exit(1)
        
    print("[DEPLOY][PASS] Deploy parity check passed! Both Frontend and Backend are running HEAD.")
    sys.exit(0)

if __name__ == "__main__":
    main()
