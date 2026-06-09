#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import re
import sys

def get_workspace_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def scan_for_fakes():
    root = get_workspace_root()
    violations = []

    # Patterns to look for
    p_ai_mock = re.compile(r"(\"AI\s+Mock\"|'AI\s+Mock')", re.IGNORECASE)
    # Fabricated onboarding defaults
    p_onboarding_fakes = re.compile(r"(\"Egypt\"|'Egypt').*\"age\":\s*18", re.IGNORECASE)
    p_is_approved_fake = re.compile(r"isApproved\s*:\s*true", re.IGNORECASE)
    # Target "fahem" database in seed/import files instead of "fahem_sandbox"
    p_seed_prod_db = re.compile(r"client\s*\[\s*(\"fahem\"|'fahem')\s*\]\s*\.\s*drop", re.IGNORECASE)

    for dirpath, dirnames, filenames in os.walk(root):
        if any(ignored in dirpath for ignored in [".git", ".next", "node_modules", "ignore", "__pycache__", "scratches", "artifacts", "temp"]):
            continue

        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(file_path, root)
            
            if filename in ["guard_nofakes.py", "guard_invariants.py", "guard.sh"]:
                continue

            if not filename.endswith((".ts", ".js", ".tsx", ".jsx", ".py", ".json")):
                continue

            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    lines = f.readlines()
            except Exception:
                continue

            for idx, line in enumerate(lines, 1):
                clean_line = line.strip()

                # Check "AI Mock"
                if p_ai_mock.search(line):
                    violations.append({
                        "rule": "Honesty Check: Found 'AI Mock' literal in active codebase paths.",
                        "file": rel_path,
                        "line": idx,
                        "content": clean_line
                    })

                # Check fabricated onboarding defaults (Egypt/18) in client files
                if "web/src" in rel_path.replace("\\", "/"):
                    if p_onboarding_fakes.search(line):
                        violations.append({
                            "rule": "Honesty Check: Found hardcoded default onboarding fields (Egypt, age 18) in client components.",
                            "file": rel_path,
                            "line": idx,
                            "content": clean_line
                        })

                # Check seed-to-prod destructive DB selection
                if "seed" in rel_path.lower() or "sync" in rel_path.lower() or "migrate" in rel_path.lower():
                    if p_seed_prod_db.search(line):
                        violations.append({
                            "rule": "Honesty Check: Seeding/migration scripts must never drop or delete production databases.",
                            "file": rel_path,
                            "line": idx,
                            "content": clean_line
                        })

    return violations

def main():
    print("==================================================")
    print("[NO-FAKES] Running Honesty and AI Mock Check (G4)")
    print("==================================================")
    violations = scan_for_fakes()
    
    if violations:
        print(f"[NO-FAKES][FAIL] Found {len(violations)} honesty/fake-data violations:")
        for v in violations:
            print(f"  [-] {v['file']}:{v['line']} - {v['rule']}")
            print(f"      Code: {v['content']}\n")
        sys.exit(1)
        
    print("[NO-FAKES][PASS] No fakes or fabricated data detected!")
    sys.exit(0)

if __name__ == "__main__":
    main()
