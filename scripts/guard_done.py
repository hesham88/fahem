#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import json
import subprocess
import hashlib
import hmac

# Ensure UTF-8 printing
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def get_workspace_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def get_local_sha():
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"]).decode("utf-8").strip()
    except Exception as e:
        print(f"[DONE][WARN] Failed to get local git SHA: {e}")
        return "unknown"

def get_file_sha256(filepath):
    if not os.path.exists(filepath):
        return "not_found"
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()

def run_script(script_name):
    root = get_workspace_root()
    script_path = os.path.join(root, "scripts", script_name)
    print(f"[DONE] Running underlying guard: {script_name}...")
    res = subprocess.run([sys.executable, script_path])
    return res.returncode == 0

# Predicate rules: (Required phrases, Forbidden phrases)
DBOX_PREDICATES = {
    "D0": (["version", "sha", "api"], ["cluster card", "subject="]),
    "D1": (["sandbox", "demo"], ["not eligible", "غير مؤهل"]),
    "D2": (["isolation", "sandbox"], ["production database", "prod"]),
    "D3": (["persona", "admin", "teacher", "student"], ["access denied", "unauthorized", "blank"]),
    "D4": (["kill", "wipe", "purg", "reset"], ["session active"]),
    "D5": (["citation", "grounded", "reference"], ["0 books", "empty library", "no books"]),
    "D6": (["ingest", "embed"], ["45% hang", "stuck"]),
    "D7": (["chapter", "title"], ["statements & programming", "statements and programming"]),
    "D8": (["audio", "tts", "speak", "voice"], ["robotic"]),
    "D9": (["admin", "token", "report"], ["500", "internal server error"]),
    "D10": (["language", "turn"], ["flip", "mixed language"]),
    "D11": (["light", "paint"], ["dark default"]),
    "D12": (["responsive", "360px", "mobile"], ["overflow", "horizontal scroll"]),
    "D13": (["navigation", "reachable"], ["bounce", "trap"]),
    "D14": (["brand", "logo", "favicon", "png"], ["inline-path", "placeholder"]),
    "D15": (["donation", "paypal"], ["broken link"]),
    "D16": (["adsense", "ad", "placeholder"], ["intrusive", "pop-up"]),
    "D-CRUD": (["crud", "curriculum", "studio"], ["failed to save"]),
    "D-Contact": (["contact", "form"], ["failed to send"])
}

def check_evidence(task_id):
    root = get_workspace_root()
    evidence_dir = os.path.join(root, "evidence")
    evidence_path = os.path.join(evidence_dir, f"{task_id}.json")
    
    if not os.path.exists(evidence_path):
        print(f"[DONE][FAIL] Evidence file not found at: {evidence_path}")
        return False
        
    try:
        with open(evidence_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"[DONE][FAIL] Failed to parse evidence file {evidence_path}: {e}")
        return False
        
    required_fields = [
        "task", "builder", "d_box", "sha", 
        "frontend_revision", "backend_revision", 
        "smoke", "vision_verdict", "timestamp", "run_signature"
    ]
    
    missing_fields = [f for f in required_fields if f not in data]
    if missing_fields:
        print(f"[DONE][FAIL] Evidence file is missing required fields: {missing_fields}")
        return False
        
    if data["task"] != task_id:
        print(f"[DONE][FAIL] Task ID in evidence ({data['task']}) does not match requested task ({task_id}).")
        return False

    # 1. Enforce Task -> D-box mapping
    dbox_map_path = os.path.join(evidence_dir, "dbox_map.json")
    if not os.path.exists(dbox_map_path):
        print(f"[DONE][FAIL] Task map not found: {dbox_map_path}")
        return False
        
    with open(dbox_map_path, "r", encoding="utf-8") as f:
        dbox_map = json.load(f)
        
    expected_dbox = dbox_map.get(task_id)
    if not expected_dbox:
        print(f"[DONE][FAIL] Task ID {task_id} is not registered in dbox_map.json.")
        return False
        
    if data["d_box"] != expected_dbox:
        print(f"[DONE][FAIL] Task/D-box mismatch! Expected: {expected_dbox}, Found: {data['d_box']}")
        return False
        
    local_sha = get_local_sha()
    if data["sha"] != local_sha:
        print(f"[DONE][FAIL] SHA in evidence ({data['sha']}) does not match current git HEAD ({local_sha}).")
        return False
        
    smoke = data["smoke"]
    if not isinstance(smoke, dict):
        print("[DONE][FAIL] 'smoke' field must be a JSON object.")
        return False
        
    required_smoke_fields = ["url", "status", "assertions", "screenshots"]
    missing_smoke = [f for f in required_smoke_fields if f not in smoke]
    if missing_smoke:
        print(f"[DONE][FAIL] 'smoke' object is missing fields: {missing_smoke}")
        return False
        
    if smoke["status"] != "pass":
        print(f"[DONE][FAIL] Smoke test status in evidence is '{smoke['status']}', must be 'pass'.")
        return False

    # 2. Live-only validation for non-Task-0 closure tasks
    if task_id != "Task-0":
        url = smoke["url"]
        if not url.startswith("https://fahem.pro"):
            print(f"[DONE][FAIL] URL '{url}' is invalid. Non-Task-0 evidence must be run against live production 'https://fahem.pro'.")
            return False
        if data["frontend_revision"] == "local" or data["backend_revision"] == "local":
            print(f"[DONE][FAIL] Local revisions are not allowed for non-Task-0 closure tasks.")
            return False

    # 3. Verify screenshot existence and file SHA256 hashes
    screenshot_hashes = data.get("screenshot_hashes", {})
    for screenshot_rel_path in smoke["screenshots"]:
        screenshot_abs_path = os.path.join(root, screenshot_rel_path)
        if not os.path.exists(screenshot_abs_path):
            print(f"[DONE][FAIL] Referenced screenshot does not exist: {screenshot_rel_path}")
            return False
        
        # Verify hash match on disk vs recorded in json
        recorded_hash = screenshot_hashes.get(screenshot_rel_path)
        actual_hash = get_file_sha256(screenshot_abs_path)
        if recorded_hash != actual_hash:
            print(f"[DONE][FAIL] Screenshot hash mismatch for {screenshot_rel_path}! Recorded: {recorded_hash}, Actual: {actual_hash}")
            return False

    # 4. Verify HMAC-SHA256 run_signature
    timestamp = data["timestamp"]
    url = smoke["url"]
    screenshot_hashes_sorted = ",".join(f"{k}={v}" for k, v in sorted(screenshot_hashes.items()))
    msg = f"{task_id}:{data['d_box']}:{local_sha}:{url}:{screenshot_hashes_sorted}:{timestamp}"
    
    salt = "fahem_guard_secure_salt_2026"
    expected_signature = hmac.new(salt.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256).hexdigest()
    if data["run_signature"] != expected_signature:
        print("[DONE][FAIL] Evidence run signature is INVALID! Hand-authored or modified evidence is prohibited.")
        return False

    # 5. Vision verdict pass-assertion verification
    vision_verdict = data["vision_verdict"]
    if not vision_verdict or not vision_verdict.strip().lower().startswith("pass"):
        print(f"[DONE][FAIL] vision_verdict must begin with 'pass', got: '{vision_verdict}'")
        return False

    # Validate against dbox-specific rules
    pred_rules = DBOX_PREDICATES.get(data["d_box"])
    if pred_rules:
        req_keywords, forbidden_phrases = pred_rules
        verdict_lower = vision_verdict.lower()
        
        # Check forbidden phrases
        for forbidden in forbidden_phrases:
            if forbidden in verdict_lower:
                print(f"[DONE][FAIL] Vision verdict violates the {data['d_box']} predicate! Found forbidden phrase: '{forbidden}'")
                print(f"       Verdict: '{vision_verdict}'")
                return False
                
        # Optional helper: print warning or notice if no required keywords are present
        found_req = [req for req in req_keywords if req in verdict_lower]
        if not found_req and req_keywords:
            print(f"[DONE][WARN] Vision verdict doesn't contain standard required words for {data['d_box']}: {req_keywords}")

    print(f"[DONE][PASS] Evidence file {evidence_path} is complete and fully valid!")
    print(f"       Task: {data['task']} | Box: {data['d_box']} | SHA: {data['sha']}")
    print(f"       Vision Verdict: {data['vision_verdict']}")
    return True

def main():
    if len(sys.argv) < 2:
        print("Usage: python guard_done.py <task_id>")
        sys.exit(1)
        
    task_id = sys.argv[1]
    
    print("==================================================")
    print(f"[DONE] Running Definition of Done gate for: {task_id} (G7)")
    print("==================================================")
    
    # 1. Run Drift Check
    if not run_script("guard_drift.py"):
        print("[DONE][FAIL] Drift check failed.")
        sys.exit(1)
        
    # 2. Run Invariants Lint
    if not run_script("guard_invariants.py"):
        print("[DONE][FAIL] Invariants lint check failed.")
        sys.exit(1)
        
    # 3. Run NoFakes Lint
    if not run_script("guard_nofakes.py"):
        print("[DONE][FAIL] No-fakes check failed.")
        sys.exit(1)
        
    # 4. Run Regressions Suite
    if not run_script("guard_regressions.py"):
        print("[DONE][FAIL] Regression test suite failed.")
        sys.exit(1)
        
    # 5. Check Evidence JSON
    if not check_evidence(task_id):
        print("[DONE][FAIL] Evidence verification failed.")
        sys.exit(1)
        
    print(f"\n[DONE][SUCCESS] Task {task_id} has fully met the Definition of Done!")
    sys.exit(0)

if __name__ == "__main__":
    main()
