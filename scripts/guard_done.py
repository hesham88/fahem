#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import json
import subprocess

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

def run_script(script_name):
    root = get_workspace_root()
    script_path = os.path.join(root, "scripts", script_name)
    print(f"[DONE] Running underlying guard: {script_name}...")
    res = subprocess.run([sys.executable, script_path])
    return res.returncode == 0

def check_evidence(task_id):
    root = get_workspace_root()
    evidence_dir = os.path.join(root, "evidence")
    evidence_path = os.path.join(evidence_dir, f"{task_id}.json")
    
    if not os.path.exists(evidence_path):
        print(f"[DONE][FAIL] Evidence file not found at: {evidence_path}")
        print(f"Please run playright smoke test and generate the evidence file for {task_id}.")
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
        "smoke", "vision_verdict", "timestamp"
    ]
    
    missing_fields = [f for f in required_fields if f not in data]
    if missing_fields:
        print(f"[DONE][FAIL] Evidence file is missing required fields: {missing_fields}")
        return False
        
    if data["task"] != task_id:
        print(f"[DONE][FAIL] Task ID in evidence ({data['task']}) does not match requested task ({task_id}).")
        return False
        
    local_sha = get_local_sha()
    if data["sha"] != local_sha:
        print(f"[DONE][FAIL] SHA in evidence ({data['sha']}) does not match current git HEAD ({local_sha}).")
        print("Please re-run the smoke test at current HEAD to produce a fresh evidence file.")
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
        
    if not isinstance(smoke["assertions"], list) or len(smoke["assertions"]) == 0:
        print("[DONE][FAIL] 'assertions' must be a non-empty list of verified DOM/text claims.")
        return False
        
    if not isinstance(smoke["screenshots"], list) or len(smoke["screenshots"]) == 0:
        print("[DONE][FAIL] 'screenshots' must be a non-empty list of screenshot paths.")
        return False
        
    # Check that referenced screenshots actually exist
    for screenshot_rel_path in smoke["screenshots"]:
        screenshot_abs_path = os.path.join(root, screenshot_rel_path)
        if not os.path.exists(screenshot_abs_path):
            print(f"[DONE][FAIL] Referenced screenshot does not exist: {screenshot_rel_path} (absolute: {screenshot_abs_path})")
            return False
            
    vision_verdict = data["vision_verdict"]
    if not vision_verdict or not vision_verdict.strip().lower().startswith("pass"):
        print(f"[DONE][FAIL] vision_verdict must begin with 'pass', got: '{vision_verdict}'")
        return False
        
    print(f"[DONE][PASS] Evidence file {evidence_path} is complete and valid!")
    print(f"       Task: {data['task']} | Box: {data['d_box']} | SHA: {data['sha']}")
    print(f"       Vision Verdict: {data['vision_verdict']}")
    return True

def main():
    if len(sys.argv) < 2:
        print("Usage: python guard_done.py <task_id> [--local]")
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
