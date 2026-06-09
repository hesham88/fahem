#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Guard Integrity — the guard that watches the guards (BG.8 #7 + anti-self-stub).

Scans every scripts/guard_*.py (the VERIFIERS) and the e2e specs for weakening:
  - a VERIFIER that WRITES its own evidence (the self-stub fraud),
  - placeholder/auto-generated evidence (`.write("placeholder")`, `dummy_hash_for_`,
    `baseline_data`, `Bootstrapping`),
  - skipped/focused tests, multiple whitelisted SHAs, localhost-in-prod fallbacks,
  - too few real assertions in the smoke spec.

Only guard_smoke.py (the EMITTER/runner) and guard_integrity.py (self) are allowed
to be excluded from the "must not write evidence" rule.
"""

import os
import sys
import re
import glob

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


# Files that may legitimately emit evidence or hold scanner patterns:
EMITTER_OR_SELF = {"guard_smoke.py", "guard_integrity.py"}

# Self-stub / auto-generation signatures (regex, case-insensitive where useful).
P_EVIDENCE_WRITE = re.compile(r"open\s*\([^)]*evidence[^)]*,\s*['\"][aw]", re.IGNORECASE)
P_WRITE_PLACEHOLDER = re.compile(r"\.write\s*\(\s*['\"]placeholder", re.IGNORECASE)
P_DUMMY_HASH = re.compile(r"dummy_hash_for_")
P_AUTOGEN = re.compile(r"baseline_data|Bootstrapping placeholder|Bootstrapping fresh", re.IGNORECASE)

# Structural weakening:
P_SKIP = re.compile(r"\.(skip|only)\s*\(", re.IGNORECASE)
P_MULTI_SHA = re.compile(r"allowed_shas\s*=\s*\{[^}]*,[^}]*\}")


def main():
    print("==================================================")
    print("[INTEGRITY] Guard Integrity Sweep (BG.8 #7 + anti-self-stub)")
    print("==================================================")

    r = root()
    violations = []

    guard_files = sorted(glob.glob(os.path.join(r, "scripts", "guard_*.py")))
    spec_files = sorted(glob.glob(os.path.join(r, "web", "e2e", "*.spec.ts")))

    for fp in guard_files:
        fname = os.path.basename(fp)
        rel = os.path.relpath(fp, r)
        if fname == "guard_integrity.py":
            continue  # the scanner legitimately holds every pattern string; owner/CI-owned (BG.8 #7)
        try:
            lines = open(fp, "r", encoding="utf-8").readlines()
        except Exception as e:
            violations.append(f"Could not read {rel}: {e}")
            continue

        is_verifier = fname not in EMITTER_OR_SELF
        for idx, line in enumerate(lines, 1):
            clean = line.strip()

            # Anti-self-stub: a verifier must never write evidence or fabricate placeholders.
            if is_verifier:
                if P_EVIDENCE_WRITE.search(line):
                    violations.append(f"{rel}:{idx} — VERIFIER writes its own evidence (self-stub): '{clean}'")
                if P_WRITE_PLACEHOLDER.search(line):
                    violations.append(f"{rel}:{idx} — writes literal placeholder bytes: '{clean}'")
                if P_DUMMY_HASH.search(line):
                    violations.append(f"{rel}:{idx} — fabricates dummy_hash evidence: '{clean}'")
                if P_AUTOGEN.search(line):
                    violations.append(f"{rel}:{idx} — auto-generates baseline/placeholder evidence: '{clean}'")

            # Deploy parity must never whitelist more than HEAD.
            if fname == "guard_deploy.py" and P_MULTI_SHA.search(line):
                violations.append(f"{rel}:{idx} — multiple whitelisted SHAs in deploy parity: '{clean}'")

            # localhost smuggled into a prod path.
            low = clean.lower()
            if "localhost" in low and "prod" in low and "use_local" not in low and "local_sha" not in low \
               and not clean.startswith("#") and not clean.startswith("//"):
                violations.append(f"{rel}:{idx} — localhost/prod fallback leak: '{clean}'")

    # E2E specs: no skipped/focused tests; enough real assertions.
    for sp in spec_files:
        rel = os.path.relpath(sp, r)
        try:
            content = open(sp, "r", encoding="utf-8").read()
        except Exception as e:
            violations.append(f"Could not read {rel}: {e}")
            continue
        for idx, line in enumerate(content.splitlines(), 1):
            if P_SKIP.search(line):
                violations.append(f"{rel}:{idx} — skipped/focused test: '{line.strip()}'")
        if os.path.basename(sp) == "guard_smoke.spec.ts":
            n = content.count("expect(")
            print(f"[INTEGRITY] {rel}: {n} expect() assertions.")
            if n < 15:
                violations.append(f"{rel} has only {n} expect() assertions (need >= 15 for D0-D16+).")

    if violations:
        print(f"\n[INTEGRITY][FAIL] Guard integrity compromised — {len(violations)} findings:")
        for v in violations:
            print(f"  [-] {v}")
        sys.exit(1)

    print("\n[INTEGRITY][PASS] Guard suite is pristine — no self-stub, skips, whitelists, or leaks.")
    sys.exit(0)


if __name__ == "__main__":
    main()
