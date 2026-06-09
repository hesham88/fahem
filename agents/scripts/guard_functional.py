#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Guard Functional (BG.9) — backend/functional gate VERIFIER.

PRINCIPLE: guards VERIFY, runners EMIT. This script NEVER writes evidence and
NEVER hardcodes a pass. Each GF1-GF9 + GF-SEED must be PROVEN by a real,
re-checkable method declared in evidence/func/<gate>.json:

  method = "dbox"       proof.task → evidence/<task>.json must pass guard_done
  method = "live_probe" proof.url + expect_status (+ must_contain[]) re-fetched now
  method = "pytest"     proof.path re-run now, must exit 0
  method = "artifact"   proof.file under evidence/func/run/ exists, non-trivial, must_contain

Hand-authored gates (no method/proof, or invented `details` numbers) FAIL.
"""

import os
import sys
import json
import re
import time
import hmac
import hashlib
import subprocess
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

GATES = ["GF1", "GF2", "GF3", "GF4", "GF5", "GF6", "GF7", "GF8", "GF9", "GF-SEED"]
VALID_METHODS = {"dbox", "live_probe", "pytest", "artifact"}
SALT = b"FAHEM_GUARD_SECRET_2026"


def root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def head_sha():
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"]).decode("utf-8").strip()
    except Exception:
        return "unknown"


def expected_sig(gate, sha, method, proof, ts):
    msg = f"{gate}|{sha}|{method}|{json.dumps(proof, sort_keys=True)}|{ts}"
    return hmac.new(SALT, msg.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_dbox(proof):
    task = proof.get("task")
    if not task:
        return False, "method 'dbox' requires proof.task"
    try:
        import guard_done
        ok = guard_done.check_evidence(task)
        return (ok, "" if ok else f"backing D-box evidence for '{task}' did not pass guard_done")
    except Exception as e:
        return False, f"could not verify dbox '{task}': {e}"


def verify_live_probe(proof):
    url = proof.get("url", "")
    if not url.startswith("https://fahem.pro") and ".run.app" not in url:
        return False, f"live_probe url must be live prod (got '{url}')"
    expect = int(proof.get("expect_status", 0))
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Fahem-Guard"})
        try:
            resp = urllib.request.urlopen(req, timeout=20)
            status, body = resp.getcode(), resp.read(8192).decode("utf-8", "ignore")
        except urllib.error.HTTPError as he:
            status, body = he.code, ""
    except Exception as e:
        return False, f"probe failed to reach {url}: {e}"
    if expect and status != expect:
        return False, f"{url} returned {status}, expected {expect}"
    for needle in proof.get("must_contain", []):
        if needle.lower() not in body.lower():
            return False, f"{url} body missing required substring '{needle}'"
    return True, ""


def verify_pytest(proof):
    path = proof.get("path")
    if not path:
        return False, "method 'pytest' requires proof.path"
    abspath = os.path.join(root(), path)
    if not os.path.exists(abspath):
        return False, f"pytest target not found: {path}"
    try:
        res = subprocess.run([sys.executable, "-m", "pytest", abspath, "-q"],
                            cwd=root(), capture_output=True, text=True, timeout=600)
        return (res.returncode == 0, "" if res.returncode == 0 else f"pytest failed:\n{res.stdout[-1200:]}")
    except Exception as e:
        return False, f"pytest run error: {e}"


def verify_artifact(proof):
    f = proof.get("file", "")
    if not f.startswith("evidence/func/run/"):
        return False, "method 'artifact' requires proof.file under evidence/func/run/"
    ap = os.path.join(root(), f)
    if not os.path.exists(ap) or os.path.getsize(ap) < 64:
        return False, f"artifact missing or trivial: {f}"
    try:
        txt = open(ap, "r", encoding="utf-8", errors="ignore").read()
    except Exception as e:
        return False, f"cannot read artifact {f}: {e}"
    for needle in proof.get("must_contain", []):
        if needle.lower() not in txt.lower():
            return False, f"artifact {f} missing required substring '{needle}'"
    return True, ""


def verify_gate(gate, sha):
    ev = os.path.join(root(), "evidence", "func", f"{gate}.json")
    if not os.path.exists(ev):
        return False, f"evidence/func/{gate}.json MISSING (emit it from a real run; the guard will not fabricate it)"
    try:
        data = json.load(open(ev, "r", encoding="utf-8"))
    except Exception as e:
        return False, f"parse error: {e}"

    for fld in ("gate", "sha", "status", "method", "proof", "timestamp", "signature"):
        if fld not in data:
            return False, f"missing field '{fld}' (hand-authored/stub gate)"
    if data["gate"] != gate:
        return False, f"gate id mismatch ({data['gate']})"
    if data["sha"] != sha:
        return False, f"sha {data['sha']} != HEAD {sha} (stale)"
    if data["method"] not in VALID_METHODS:
        return False, f"method '{data['method']}' invalid; must be one of {sorted(VALID_METHODS)}"

    proof = data["proof"]
    if data["signature"] != expected_sig(gate, sha, data["method"], proof, data["timestamp"]):
        return False, "signature invalid — evidence was hand-edited or not runner-emitted"

    method = data["method"]
    ok, why = {
        "dbox": verify_dbox,
        "live_probe": verify_live_probe,
        "pytest": verify_pytest,
        "artifact": verify_artifact,
    }[method](proof)
    if not ok:
        return False, why
    if data["status"] != "pass":
        return False, f"verified check passed but status='{data['status']}'"
    return True, ""


def main():
    print("==================================================")
    print("[FUNCTIONAL] Verifying G-series Functional Gates (BG.9) — VERIFY ONLY")
    print("==================================================")
    sha = head_sha()
    failures = []
    for gate in GATES:
        ok, why = verify_gate(gate, sha)
        if ok:
            print(f"  [+] {gate}: verified by real method.")
        else:
            failures.append(f"{gate}: {why}")

    if failures:
        print(f"\n[FUNCTIONAL][FAIL] {len(failures)} functional gates unproven:")
        for f in failures:
            print(f"  [-] {f}")
        sys.exit(1)

    print("\n[FUNCTIONAL][PASS] GF1-GF9 + GF-SEED all proven by real, re-checked methods.")
    sys.exit(0)


if __name__ == "__main__":
    main()
