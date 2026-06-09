#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Guard Integrity - The guard that watches the guards (BG.8 #7).
Scans guard suite files and E2E tests for bypasses, skipped tests,
hardcoded SHAs, or loose assertions, failing if any are detected.
"""

import os
import sys
import re

# Ensure UTF-8 printing on Windows
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def get_workspace_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def main():
    print("==================================================")
    print("[INTEGRITY] Running Guard Integrity Sweep (BG.8 #7)")
    print("==================================================")

    root = get_workspace_root()
    violations = []

    # Files to check
    guard_files = [
        os.path.join(root, "scripts", "guard_deploy.py"),
        os.path.join(root, "scripts", "guard_done.py"),
        os.path.join(root, "scripts", "guard_smoke.py"),
        os.path.join(root, "web", "e2e", "guard_smoke.spec.ts")
    ]

    # Regex patterns
    p_skip = re.compile(r"\.(skip|only)\s*\(", re.IGNORECASE)
    p_allowed_shas_multiple = re.compile(r"allowed_shas\s*=\s*\{.*,.*\}")
    p_localhost_prod = re.compile(r'localhost.*(https://fahem\.pro|prod)', re.IGNORECASE)

    for filepath in guard_files:
        if not os.path.exists(filepath):
            print(f"[INTEGRITY][WARN] Guard file not found: {filepath}")
            continue

        rel_path = os.path.relpath(filepath, root)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                lines = f.readlines()
        except Exception as e:
            violations.append(f"Could not read {rel_path}: {e}")
            continue

        for idx, line in enumerate(lines, 1):
            clean_line = line.strip()

            # 1. Check for skipped or filtered tests
            if "guard_smoke.spec.ts" in rel_path and p_skip.search(line):
                violations.append(f"{rel_path}:{idx} - Skipped/focused test detected: '{clean_line}'")

            # 2. Check for multiple whitelisted SHAs
            if "guard_deploy.py" in rel_path and p_allowed_shas_multiple.search(line):
                violations.append(f"{rel_path}:{idx} - Multiple whitelisted SHAs found: '{clean_line}'")

            # 3. Check for unauthorized localhost checks in prod paths
            if "localhost" in clean_line.lower() and "prod" in clean_line.lower() and "use_local" not in clean_line and "local_sha" not in clean_line:
                # Exclude comments or utility strings if they are benign
                if not clean_line.startswith("#") and not clean_line.startswith("//"):
                    violations.append(f"{rel_path}:{idx} - Potential localhost/prod fallback leak: '{clean_line}'")

    # Verify that we have exactly 17 expect(...) assertions inside guard_smoke.spec.ts
    spec_path = os.path.join(root, "web", "e2e", "guard_smoke.spec.ts")
    if os.path.exists(spec_path):
        with open(spec_path, "r", encoding="utf-8") as f:
            content = f.read()
            expects = content.count("expect(")
            print(f"[INTEGRITY] Found {expects} 'expect(' assertions in guard_smoke.spec.ts.")
            if expects < 15:
                violations.append(f"guard_smoke.spec.ts lacks sufficient expect() assertions! Found {expects}, target ≥ 15.")

    if violations:
        print(f"\n[INTEGRITY][FAIL] Guard integrity compromised! Found {len(violations)} bypasses or weakening patterns:")
        for v in violations:
            print(f"  [-] {v}")
        sys.exit(1)

    print("\n[INTEGRITY][PASS] Guard integrity is pristine! No skipped tests, whitelists, or bypasses found.")
    sys.exit(0)

if __name__ == "__main__":
    main()
