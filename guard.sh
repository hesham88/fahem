#!/usr/bin/env bash

# ==============================================================================
# Bible Guard Master CLI Entry Point
# Usage: ./guard.sh <phase> [arguments]
#   ./guard.sh pre-claim [task_id] [builder_name]
#   ./guard.sh pre-done <task_id>
#   ./guard.sh deploy
# ==============================================================================

set -eo pipefail

# Locate Python executable
PYTHON_CMD="python"
if [ -f "C:/Python313/python.exe" ]; then
  PYTHON_CMD="C:/Python313/python.exe"
elif command -v python3 &>/dev/null; then
  PYTHON_CMD="python3"
fi

PHASE=$1

if [ -z "$PHASE" ]; then
  echo "Error: Missing phase argument."
  echo "Usage:"
  echo "  ./guard.sh pre-claim [task_id] [builder_name]"
  echo "  ./guard.sh pre-done <task_id>"
  echo "  ./guard.sh deploy"
  exit 1
fi

case "$PHASE" in
  pre-claim)
    echo "=== Running PRE-CLAIM Checks ==="
    "$PYTHON_CMD" scripts/guard_drift.py
    
    TASK_ID=$2
    BUILDER_NAME=$3
    if [ -n "$TASK_ID" ] && [ -n "$BUILDER_NAME" ]; then
      "$PYTHON_CMD" scripts/guard_claim.py claim "$TASK_ID" "$BUILDER_NAME"
    elif [ -n "$TASK_ID" ]; then
      "$PYTHON_CMD" scripts/guard_claim.py check "$TASK_ID"
    fi
    echo "=== PRE-CLAIM Checks Passed ==="
    ;;

  pre-done)
    TASK_ID=$2
    if [ -z "$TASK_ID" ]; then
      echo "Error: Missing task_id for pre-done check."
      echo "Usage: ./guard.sh pre-done <task_id>"
      exit 1
    fi
    
    echo "=== Running PRE-DONE Checks for task $TASK_ID ==="
    "$PYTHON_CMD" scripts/guard_drift.py
    "$PYTHON_CMD" scripts/guard_invariants.py
    "$PYTHON_CMD" scripts/guard_nofakes.py
    "$PYTHON_CMD" scripts/guard_regressions.py
    "$PYTHON_CMD" scripts/guard_integrity.py
    "$PYTHON_CMD" scripts/guard_coverage.py
    "$PYTHON_CMD" scripts/guard_functional.py
    "$PYTHON_CMD" scripts/guard_smoke.py "$TASK_ID" "${@:3}"
    "$PYTHON_CMD" scripts/guard_done.py "$TASK_ID" "${@:3}"
    echo "=== ALL PRE-DONE Checks Passed for task $TASK_ID ===";;

  deploy)
    echo "=== Running DEPLOY Checklist ==="
    
    echo "Step 1: Running local code-level guards before build..."
    "$PYTHON_CMD" scripts/guard_drift.py
    "$PYTHON_CMD" scripts/guard_invariants.py
    "$PYTHON_CMD" scripts/guard_nofakes.py
    "$PYTHON_CMD" scripts/guard_regressions.py
    "$PYTHON_CMD" scripts/guard_integrity.py
    "$PYTHON_CMD" scripts/guard_coverage.py
    "$PYTHON_CMD" scripts/guard_functional.py
    
    echo "Step 2: Performing Next.js build verification..."
    cd web
    npm run build
    cd ..
    
    echo "Step 3: Running Deploy Parity check (G8)..."
    "$PYTHON_CMD" scripts/guard_deploy.py
    
    echo "Step 4: Running authenticated E2E Smoke Tests (G6)..."
    "$PYTHON_CMD" scripts/guard_smoke.py "Task-0" "D0"
    
    echo "=== DEPLOY Verification Successful! (D0 is GREEN) ==="
    ;;

  *)
    echo "Error: Unknown phase '$PHASE'."
    echo "Available phases: pre-claim, pre-done, deploy"
    exit 1
    ;;
esac
