#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Guard Coverage (BG.8a) — per-part VISUAL proof verifier.

PRINCIPLE: guards VERIFY, runners EMIT. This script NEVER writes evidence.
A missing/placeholder/stub part = FAIL, never an auto-generated pass.

For every part in web/e2e/parts.manifest.json it requires evidence/parts/<id>.json with:
  - real screenshot files that are valid PNGs (magic bytes), >= MIN_PNG_BYTES,
  - screenshot_hashes that equal the RECOMPUTED sha256 of the file on disk
    (rejects "dummy_hash"/"placeholder"/"mock"),
  - at least the desktop AND mobile viewport axes captured (responsive proof),
  - a vision_verdict that starts with "pass", is substantive, has no forbidden
    token, and references the part's pass_predicate,
  - and NO two distinct parts may share the same REAL file bytes (real-hash dedup).
"""

import os
import sys
import json
import re
import subprocess
import hashlib

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

MIN_PNG_BYTES = 8192
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
FORBIDDEN_TOKENS = ["placeholder", "dummy", "mock", "lorem", "todo", "fixme", "stub", "fake"]
# A part's screenshots (by filename) must collectively hit BOTH groups → desktop + mobile proven.
AXIS_DESKTOP = ["desktop", "1440", "1280", "1024", "lg"]
AXIS_MOBILE = ["mobile", "360", "390", "sm", "xs"]
STOPWORDS = {"with", "and", "the", "for", "is", "are", "a", "an", "of", "to", "in",
            "present", "visible", "intact", "showing", "shows", "renders", "render",
            "real", "active", "loads", "load", "this", "that", "on", "or"}


def get_workspace_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def get_local_sha():
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"]).decode("utf-8").strip()
    except Exception as e:
        print(f"[COVERAGE][WARN] Failed to get local git SHA: {e}")
        return "unknown"


def sha256_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def is_real_png(path):
    try:
        if os.path.getsize(path) < MIN_PNG_BYTES:
            return False, f"too small ({os.path.getsize(path)} bytes < {MIN_PNG_BYTES})"
        with open(path, "rb") as f:
            if f.read(8) != PNG_MAGIC:
                return False, "not a valid PNG (bad magic bytes) — placeholder/stub"
        return True, ""
    except Exception as e:
        return False, str(e)


def predicate_keywords(predicate):
    words = re.findall(r"[a-zA-Z]{4,}", (predicate or "").lower())
    return {w for w in words if w not in STOPWORDS}


def main():
    print("==================================================")
    print("[COVERAGE] Running UI Visual Coverage Gate (BG.8a) — VERIFY ONLY")
    print("==================================================")

    root = get_workspace_root()
    manifest_path = os.path.join(root, "web", "e2e", "parts.manifest.json")
    parts_dir = os.path.join(root, "evidence", "parts")
    local_sha = get_local_sha()

    if not os.path.exists(manifest_path):
        print(f"[COVERAGE][FAIL] parts.manifest.json not found: {manifest_path}")
        sys.exit(1)
    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            parts = json.load(f)
    except Exception as e:
        print(f"[COVERAGE][FAIL] Failed to parse parts.manifest.json: {e}")
        sys.exit(1)

    print(f"[COVERAGE] {len(parts)} UI parts declared. Verifying real evidence for each.\n")

    failures = []
    real_hash_owner = {}  # real file sha256 -> part_id (cross-part byte dedup)

    for part in parts:
        pid = part.get("id")
        predicate = part.get("pass_predicate", "")
        ev_path = os.path.join(parts_dir, f"{pid}.json")

        if not os.path.exists(ev_path):
            failures.append(f"{pid}: evidence/parts/{pid}.json MISSING (capture it; the guard will not fabricate it).")
            continue
        try:
            with open(ev_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            failures.append(f"{pid}: evidence parse error: {e}")
            continue

        if data.get("part_id") != pid:
            failures.append(f"{pid}: part_id mismatch in evidence ({data.get('part_id')}).")
            continue
        if data.get("sha") != local_sha:
            failures.append(f"{pid}: evidence sha {data.get('sha')} != HEAD {local_sha} (stale; re-capture).")
            continue
        if data.get("status") != "pass":
            failures.append(f"{pid}: status is '{data.get('status')}', must be 'pass'.")
            continue

        shots = data.get("screenshots", [])
        hashes = data.get("screenshot_hashes", {})
        if not isinstance(shots, list) or len(shots) == 0:
            failures.append(f"{pid}: no screenshots listed.")
            continue

        part_failed = False
        names_blob = " ".join(shots).lower()
        # Responsive axes: desktop + mobile must both be represented by filename.
        if not any(tok in names_blob for tok in AXIS_DESKTOP):
            failures.append(f"{pid}: no DESKTOP axis screenshot (filename must include one of {AXIS_DESKTOP}).")
            part_failed = True
        if not any(tok in names_blob for tok in AXIS_MOBILE):
            failures.append(f"{pid}: no MOBILE axis screenshot (filename must include one of {AXIS_MOBILE}); responsive proof required.")
            part_failed = True

        for rel in shots:
            ap = os.path.join(root, rel)
            if not os.path.exists(ap):
                failures.append(f"{pid}: screenshot missing on disk: {rel}")
                part_failed = True
                continue
            ok, why = is_real_png(ap)
            if not ok:
                failures.append(f"{pid}: invalid screenshot {rel} — {why}")
                part_failed = True
                continue
            recorded = str(hashes.get(rel, ""))
            if any(tok in recorded.lower() for tok in FORBIDDEN_TOKENS) or not re.fullmatch(r"[0-9a-f]{64}", recorded):
                failures.append(f"{pid}: screenshot_hashes['{rel}'] is not a real sha256 (got '{recorded}').")
                part_failed = True
                continue
            actual = sha256_of(ap)
            if recorded != actual:
                failures.append(f"{pid}: hash mismatch for {rel} (recorded {recorded[:12]} != actual {actual[:12]}).")
                part_failed = True
                continue
            # Real byte-level cross-part dedup (the "one screenshot for everything" killer).
            owner = real_hash_owner.get(actual)
            if owner and owner != pid:
                failures.append(f"{pid}: screenshot {rel} is BYTE-IDENTICAL to part '{owner}'. Each part needs its own capture.")
                part_failed = True
            else:
                real_hash_owner[actual] = pid

        verdict = (data.get("vision_verdict") or "").strip()
        vl = verdict.lower()
        if not vl.startswith("pass"):
            failures.append(f"{pid}: vision_verdict must start with 'pass'.")
            part_failed = True
        elif len(verdict) < 40:
            failures.append(f"{pid}: vision_verdict too thin ({len(verdict)} chars) — describe what is actually shown.")
            part_failed = True
        else:
            for tok in FORBIDDEN_TOKENS:
                if tok in vl:
                    failures.append(f"{pid}: vision_verdict contains forbidden token '{tok}'.")
                    part_failed = True
                    break
            kws = predicate_keywords(predicate)
            if kws and not (kws & set(re.findall(r"[a-zA-Z]{4,}", vl))):
                failures.append(f"{pid}: vision_verdict does not reference the part's predicate (expected one of {sorted(kws)[:6]}).")
                part_failed = True

        if not part_failed:
            print(f"  [+] {pid}: real evidence verified ({len(shots)} shots, desktop+mobile).")

    if failures:
        print(f"\n[COVERAGE][FAIL] {len(failures)} coverage violations:")
        for f in failures:
            print(f"  [-] {f}")
        sys.exit(1)

    print(f"\n[COVERAGE][PASS] All {len(parts)} parts proven with real, unique, responsive captures.")
    sys.exit(0)


if __name__ == "__main__":
    main()
