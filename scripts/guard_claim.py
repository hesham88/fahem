#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import json
import sys
from datetime import datetime

def get_claims_file():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    return os.path.join(root, "temp", "bible_progress", "claims.json")

def load_claims():
    path = get_claims_file()
    if not os.path.exists(path):
        return {"claims": []}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"claims": []}

def save_claims(claims_data):
    path = get_claims_file()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(claims_data, f, indent=2, ensure_ascii=False)

def main():
    if len(sys.argv) < 2:
        print("Usage: guard_claim.py <action> [task_id] [builder_name]")
        print("Actions: check | claim | release")
        sys.exit(1)
        
    action = sys.argv[1].lower()
    
    if action == "check":
        if len(sys.argv) < 3:
            print("Usage: guard_claim.py check <task_id>")
            sys.exit(1)
        task_id = sys.argv[2]
        claims_data = load_claims()
        for claim in claims_data.get("claims", []):
            if claim["task"] == task_id:
                print(f"[CLAIM] Task {task_id} is already claimed by {claim['builder']} at {claim['ts']}")
                sys.exit(1)
        print(f"[CLAIM] Task {task_id} is free.")
        sys.exit(0)
        
    elif action == "claim":
        if len(sys.argv) < 4:
            print("Usage: guard_claim.py claim <task_id> <builder_name>")
            sys.exit(1)
        task_id = sys.argv[2]
        builder = sys.argv[3]
        
        claims_data = load_claims()
        # Check if already claimed
        for claim in claims_data.get("claims", []):
            if claim["task"] == task_id:
                if claim["builder"] == builder:
                    print(f"[CLAIM] Task {task_id} is already claimed by you ({builder}).")
                    sys.exit(0)
                else:
                    print(f"[CLAIM][FAIL] Double-claim blocked! Task {task_id} is already claimed by {claim['builder']} at {claim['ts']}")
                    sys.exit(1)
                    
        # Add claim
        new_claim = {
            "task": task_id,
            "builder": builder,
            "ts": datetime.utcnow().isoformat() + "Z"
        }
        claims_data.setdefault("claims", []).append(new_claim)
        save_claims(claims_data)
        print(f"[CLAIM][SUCCESS] Task {task_id} claimed successfully by {builder}.")
        sys.exit(0)
        
    elif action == "release":
        if len(sys.argv) < 4:
            print("Usage: guard_claim.py release <task_id> <builder_name>")
            sys.exit(1)
        task_id = sys.argv[2]
        builder = sys.argv[3]
        
        claims_data = load_claims()
        claims = claims_data.get("claims", [])
        original_len = len(claims)
        claims = [c for c in claims if not (c["task"] == task_id and c["builder"] == builder)]
        
        if len(claims) < original_len:
            claims_data["claims"] = claims
            save_claims(claims_data)
            print(f"[CLAIM] Task {task_id} released successfully by {builder}.")
        else:
            print(f"[CLAIM] No active claim found for task {task_id} by {builder}.")
        sys.exit(0)
        
    else:
        print(f"Unknown action: {action}")
        sys.exit(1)

if __name__ == "__main__":
    main()
