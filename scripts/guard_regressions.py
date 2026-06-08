#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Guard Regressions - Runs the regression test suite under tests/regressions/ and 
ensures we have tests for all closed R-items (the ratchet).
"""

import os
import sys
import glob
import subprocess

def get_workspace_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def main():
    print("==================================================")
    print("[REGRESSIONS] Running Regressions Guard (G5)")
    print("==================================================")

    root = get_workspace_root()
    regressions_dir = os.path.join(root, "tests", "regressions")
    
    # Ensure directory exists
    os.makedirs(regressions_dir, exist_ok=True)

    # Defined closed R-items that MUST have tests
    # Seeding with R17, R32, and R34
    closed_r_items = ["R17", "R32", "R34"]
    print(f"[REGRESSIONS] Closed R-items that must have tests: {closed_r_items}")

    # Find test files
    test_files = glob.glob(os.path.join(regressions_dir, "test_r*.py"))
    found_test_rs = []
    for f in test_files:
        basename = os.path.basename(f)
        # Extract R-number, e.g., test_r17.py -> R17
        for r_item in closed_r_items:
            if r_item.lower() in basename.lower():
                found_test_rs.append(r_item)

    print(f"[REGRESSIONS] Found regression tests for: {found_test_rs}")

    # Check if we have a test for every closed R-item
    missing_tests = [r for r in closed_r_items if r not in found_test_rs]
    if missing_tests:
        print(f"[REGRESSIONS][FAIL] Missing regression tests for closed R-items: {missing_tests}")
        print("Every closed R-item must have a corresponding test_r<num>.py file under tests/regressions/.")
        sys.exit(1)

    # Assert total count >= closed items
    if len(test_files) < len(closed_r_items):
        print(f"[REGRESSIONS][FAIL] Total test count ({len(test_files)}) is less than closed R-items count ({len(closed_r_items)}).")
        sys.exit(1)

    # Run the tests!
    print("[REGRESSIONS] Executing regression test suite...")
    # Run unittest discovery
    cmd = [sys.executable, "-m", "unittest", "discover", "-s", "tests/regressions", "-p", "test_*.py"]
    try:
        result = subprocess.run(cmd, cwd=root, capture_output=True, text=True)
        print(result.stdout)
        if result.returncode != 0:
            print(result.stderr)
            print("[REGRESSIONS][FAIL] One or more regression tests failed!")
            sys.exit(1)
    except Exception as e:
        print(f"[REGRESSIONS][FAIL] Error running regression suite: {e}")
        sys.exit(1)

    print("[REGRESSIONS][SUCCESS] All regression tests passed successfully! Ratchet is intact.")
    sys.exit(0)

if __name__ == "__main__":
    main()
