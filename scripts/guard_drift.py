#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import re
import sys

def get_workspace_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def get_latest_changelog_id():
    root = get_workspace_root()
    readme_path = os.path.join(root, "temp", "bible", "README.md")
    if not os.path.exists(readme_path):
        print(f"[DRIFT] Error: README.md not found at {readme_path}")
        return None
    
    # We look for the first row in the CHANGELOG table, e.g. | `2026-06-08-aj` |
    with open(readme_path, "r", encoding="utf-8") as f:
        in_changelog = False
        for line in f:
            if "## CHANGELOG" in line:
                in_changelog = True
                continue
            if in_changelog and line.strip().startswith("|"):
                # Skip header rows
                if "scope (files)" in line or "---|---" in line:
                    continue
                # Extract the id from the first data row
                match = re.search(r"\|\s*`?([0-9a-zA-Z\-_]+)`?\s*\|", line)
                if match:
                    return match.group(1).strip()
    return None

def get_reconciled_changelog_id():
    root = get_workspace_root()
    understanding_path = os.path.join(root, "temp", "bible_progress", "understanding.md")
    if not os.path.exists(understanding_path):
        print(f"[DRIFT] Error: understanding.md not found at {understanding_path}")
        return None
    
    with open(understanding_path, "r", encoding="utf-8") as f:
        for line in f:
            match = re.search(r"Last CHANGELOG id reconciled:\s*`?([0-9a-zA-Z\-_]+)`?", line)
            if match:
                return match.group(1).strip()
    return None

def main():
    latest_id = get_latest_changelog_id()
    reconciled_id = get_reconciled_changelog_id()
    
    if not latest_id:
        print("[DRIFT][FAIL] Could not find latest CHANGELOG id in README.md")
        sys.exit(1)
        
    if not reconciled_id:
        print("[DRIFT][FAIL] Could not find reconciled CHANGELOG id in understanding.md")
        sys.exit(1)
        
    print(f"[DRIFT] Latest CHANGELOG id: {latest_id}")
    print(f"[DRIFT] Reconciled CHANGELOG id: {reconciled_id}")
    
    if latest_id != reconciled_id:
        print(f"[DRIFT][FAIL] Stale understanding! Latest is {latest_id}, but understanding.md is only reconciled to {reconciled_id}.")
        print("Please reconcile understanding.md before proceeding with any task.")
        sys.exit(1)
        
    print("[DRIFT][PASS] No drift detected! (0% drift)")
    sys.exit(0)

if __name__ == "__main__":
    main()
