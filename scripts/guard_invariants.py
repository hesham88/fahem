#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import re
import sys

def get_workspace_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def scan_files():
    root = get_workspace_root()
    violations = []

    # Invariant patterns
    p_mongo_client = re.compile(r"(new\s+MongoClient|MongoClient\()")
    p_delete_many_nin = re.compile(r"delete_many\s*\(.*\$nin.*", re.IGNORECASE)
    p_drop_db = re.compile(r"(dropDatabase|drop_database|\.drop\()", re.IGNORECASE)
    p_hardcoded_bypass = re.compile(r"(judge-mock|judge_bypass_session|hesham1988@|judge\.evaluation@)", re.IGNORECASE)
    # #6 anti-evasion ratchet (FC.A4): builders obfuscated whitelist emails to dodge the literal grep —
    # e.g. ["hesham1988","gmail.com"].join("@"). Catch constructed-email forms.
    p_join_email = re.compile(r"""\]\s*\.\s*join\s*\(\s*['"]@['"]\s*\)""")        # [...].join("@")
    p_charcode_atob = re.compile(r"(String\.fromCharCode\s*\(|\batob\s*\()")       # decoded-literal email/secret
    p_identity_ctx = re.compile(r"(db_target|whitelist|evalWhitelist|bypass|super-?admin|isOwner|judge|isWhitelisted|demoDomains|hesham)", re.IGNORECASE)
    p_app_verify = re.compile(r"appVerificationDisabledForTesting\s*=\s*true", re.IGNORECASE)
    p_mongodb_uri_env = re.compile(r"process\.env\.MONGODB_URI", re.IGNORECASE)
    # #11 (FC.A5): a client/script SETTING an X-Verified-Principal header = asserting a principal (the
    # Phase-0 flaw). Matches a dict key or bracket assignment, NOT the backend's legitimate .get() read.
    p_principal_inject = re.compile(r"""(["']X-Verified-Principal["']\s*:|headers\s*\[\s*["']X-Verified-Principal["']\s*\]\s*=)""", re.IGNORECASE)
    # #12 (FC.A5): the destructive seed-sync endpoint must not be called from a script/frontend.
    p_sync_db_call = re.compile(r"/admin/sync-db")

    for dirpath, dirnames, filenames in os.walk(root):
        # Ignore compiled or workspace folders
        if any(ignored in dirpath for ignored in [".git", ".next", "node_modules", "ignore", "__pycache__", "scratches", "artifacts", "temp"]):
            continue

        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(file_path, root)
            
            # Skip this script itself and other guard scripts
            if filename in ["guard_invariants.py", "guard_nofakes.py", "guard.sh"]:
                continue

            # Read text files only
            if not filename.endswith((".ts", ".js", ".tsx", ".jsx", ".py", ".sh", ".json")):
                continue

            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    lines = f.readlines()
            except Exception:
                continue

            for idx, line in enumerate(lines, 1):
                clean_line = line.strip()
                
                # Check 1: new MongoClient / MongoClient( in web/src/app/api/**
                if "web/src/app/api" in rel_path.replace("\\", "/"):
                    if p_mongo_client.search(line) and "guard:allow-mongo" not in line:
                        violations.append({
                            "rule": "Invariant #1: Next.js API routes must never connect to Mongo directly (except when explicitly bypassed).",
                            "file": rel_path,
                            "line": idx,
                            "content": clean_line
                        })

                # Check 5: delete_many with $nin or drops
                # Exclude lines in testing files or legitimate sandbox setups
                if "sandbox" not in rel_path.lower() and "test" not in rel_path.lower():
                    if p_delete_many_nin.search(line) and "guard:allow-drop" not in line:
                        violations.append({
                            "rule": "Invariant #5: delete_many with $nin is dangerous outside of sandbox/test scripts.",
                            "file": rel_path,
                            "line": idx,
                            "content": clean_line
                        })
                    if p_drop_db.search(line) and 'fahem_sandbox' not in line and 'db.name' not in line and "guard:allow-drop" not in line:
                        violations.append({
                            "rule": "Invariant #5: dropDatabase or .drop() outside sandbox is blocked.",
                            "file": rel_path,
                            "line": idx,
                            "content": clean_line
                        })

                # Check 6: Hardcoded bypasses or whitelist emails in client files (web/src/**)
                if "web/src" in rel_path.replace("\\", "/"):
                    if p_hardcoded_bypass.search(line) and "guard:allow-literal" not in line:
                        # Allow some legitimate localStorage checking/clearing or imports
                        if "local_db" in rel_path or "layout.tsx" in rel_path or "page.tsx" in rel_path:
                            # Let's inspect line content to avoid flagging necessary setup
                            if "localStorage.removeItem" in line or "localStorage.clear" in line or "isJudgeBypass" in line:
                                continue
                        # Let's flag explicit bypass strings in client code
                        violations.append({
                            "rule": "Invariant #6: No hardcoded bypass literals or whitelist emails allowed in client files.",
                            "file": rel_path,
                            "line": idx,
                            "content": clean_line
                        })
                    # #6 anti-evasion: constructed-email obfuscation that dodges the literal grep (FC.A4).
                    if "guard:allow-literal" not in line:
                        if p_join_email.search(line):
                            violations.append({
                                "rule": "Invariant #6 (anti-evasion): constructed email via [...].join(\"@\") — de-obfuscate and remove the bypass / move whitelist to server config.",
                                "file": rel_path,
                                "line": idx,
                                "content": clean_line
                            })
                        if p_charcode_atob.search(line) and p_identity_ctx.search(line):
                            violations.append({
                                "rule": "Invariant #6 (anti-evasion): identity/whitelist value built via fromCharCode/atob — no obfuscated bypasses.",
                                "file": rel_path,
                                "line": idx,
                                "content": clean_line
                            })

                # Check 7: appVerificationDisabledForTesting = true
                if p_app_verify.search(line) and "localhost" not in rel_path and "test" not in rel_path.lower():
                    violations.append({
                        "rule": "Invariant #7: appVerificationDisabledForTesting must not be true on non-localhost/non-test paths.",
                        "file": rel_path,
                        "line": idx,
                        "content": clean_line
                    })

                # Check R33: $vectorSearch hardcoded index names (verify they reference VECTOR_INDEX_NAME env variable or standard fallback)
                if "$vectorSearch" in line:
                    # If we find a line with $vectorSearch, let's verify if the index matches requirements in subsequent lines
                    # Simple heuristic: if we find hardcoded "academic_vector_search_index" or similar non-standard names, fail
                    if "academic_vector_search_index" in line:
                        violations.append({
                            "rule": "Invariant R33: Non-standard or divergent vector index names are blocked.",
                            "file": rel_path,
                            "line": idx,
                            "content": clean_line
                        })

                # Check 10: MONGODB_URI read under web/src/**
                if "web/src" in rel_path.replace("\\", "/"):
                    if p_mongodb_uri_env.search(line) and "guard:allow-env" not in line:
                        violations.append({
                            "rule": "Invariant #10: Frontend web/src/** must never read process.env.MONGODB_URI (always proxy to Python backend).",
                            "file": rel_path,
                            "line": idx,
                            "content": clean_line
                        })

                # Check 11: outbound X-Verified-Principal injection (a client/script asserting a principal). FC.A5.
                # Code files only (skip .json log strings); the backend's request.headers.get(...) read won't match.
                if not rel_path.endswith(".json"):
                    if p_principal_inject.search(line) and "guard:allow-principal" not in line:
                        violations.append({
                            "rule": "Invariant #11: No client/script may SET an X-Verified-Principal header (asserted identity). Identity is server-verified from the ID token only.",
                            "file": rel_path,
                            "line": idx,
                            "content": clean_line
                        })

                # Check 12: the destructive seed-sync endpoint must not be invoked from a script/frontend. FC.A5.
                norm_path = rel_path.replace("\\", "/")
                if not rel_path.endswith(".json") and (norm_path.startswith("scripts/") or "web/src" in norm_path):
                    if p_sync_db_call.search(line) and "guard:allow-sync" not in line:
                        violations.append({
                            "rule": "Invariant #12: /admin/sync-db (seed->DB overwrite) must not be called from scripts/frontend (R17/FC.A5 data-loss class).",
                            "file": rel_path,
                            "line": idx,
                            "content": clean_line
                        })

    return violations

def main():
    print("==================================================")
    print("[INVARIANTS] Running Invariants Lint Check (Phase-0 A.0a)")
    print("==================================================")
    violations = scan_files()
    
    if violations:
        print(f"[INVARIANTS][FAIL] Found {len(violations)} architectural violations:")
        for v in violations:
            print(f"  [-] {v['file']}:{v['line']} - {v['rule']}")
            print(f"      Code: {v['content']}\n")
        sys.exit(1)
        
    print("[INVARIANTS][PASS] All architectural invariants met!")
    sys.exit(0)

if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except AttributeError:
        pass
    main()
