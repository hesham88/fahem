#!/usr/bin/env bash
# ==============================================================================
# Bible Guard (collapsed model) — SINGLE source of truth = the independent live
# re-execution suite (scripts/reexec_dbox.py). Builder-emitted screenshots/
# verdicts/GF-stubs are NO LONGER a gate. done = the live re-exec passes on fahem.pro.
#   ./guard.sh pre-claim [task] [builder] | pre-done <task|D-box> | deploy | sweep | sweep-full | audit
# ==============================================================================
set -uo pipefail
PY="python"; [ -f "C:/Python313/python.exe" ] && PY="C:/Python313/python.exe" || { command -v python3 >/dev/null && PY="python3"; }
PHASE="${1:-}"

case "$PHASE" in
  pre-claim)
    echo "=== PRE-CLAIM ==="; "$PY" scripts/guard_drift.py || exit 1
    [ -n "${2:-}" ] && [ -n "${3:-}" ] && { "$PY" scripts/guard_claim.py claim "$2" "$3" || exit 1; }
    echo "=== PRE-CLAIM OK ===" ;;

  pre-done)
    T="${2:-}"; [ -z "$T" ] && { echo "Error: missing task/D-box."; exit 1; }
    echo "=== PRE-DONE (live re-exec truth) for $T ==="
    "$PY" scripts/guard_drift.py || exit 1
    "$PY" scripts/guard_invariants.py || exit 1
    "$PY" scripts/guard_nofakes.py || exit 1
    "$PY" scripts/guard_integrity.py || exit 1
    "$PY" scripts/reexec_dbox.py "$T"; rc=$?
    if [ "$rc" = "2" ]; then echo "[PRE-DONE] Visual/advisory box — owner must eyeball; no live re-exec gate."
    elif [ "$rc" != "0" ]; then echo "[PRE-DONE][FAIL] Live re-exec failed — feature NOT working on fahem.pro."; exit 1; fi
    echo "=== PRE-DONE PASSED for $T ===" ;;

  deploy)
    echo "=== DEPLOY (stabilize gate) ==="
    "$PY" scripts/guard_drift.py || exit 1
    "$PY" scripts/guard_invariants.py || exit 1
    "$PY" scripts/guard_nofakes.py || exit 1
    "$PY" scripts/guard_integrity.py || exit 1
    echo "Step 2: Next.js build..."; ( cd web && npm run build ) || exit 1
    echo "Step 3: Deploy parity (HEAD)..."; "$PY" scripts/guard_deploy.py || exit 1
    echo "Step 4: FULL live regression+perf sweep (the truth)..."
    "$PY" scripts/reexec_dbox.py SWEEP-FULL || { echo "[DEPLOY][FAIL] Live sweep RED — do NOT ship."; exit 1; }
    echo "=== DEPLOY VERIFIED (live sweep green) ===" ;;

  sweep)      "$PY" scripts/reexec_dbox.py SWEEP; exit $? ;;
  sweep-full) "$PY" scripts/reexec_dbox.py SWEEP-FULL; exit $? ;;
  audit)
    echo "=== AUDIT (advisory only — never blocks) ==="
    "$PY" scripts/guard_coverage.py || true
    "$PY" scripts/guard_functional.py || true
    echo "=== AUDIT done (informational) ===" ;;

  *) echo "Usage: pre-claim | pre-done <task> | deploy | sweep | sweep-full | audit"; exit 1 ;;
esac
