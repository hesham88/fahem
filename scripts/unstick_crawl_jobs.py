#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
unstick_crawl_jobs.py  —  Owner-run rescue for stuck crawl/ingestion jobs (bible FC2.1).

WHY THIS EXISTS
  The production backend `/admin/crawl` POST (services.py:trigger_crawl_job) has NO
  action handler, so the UI's pause/stop/kill proxies arrive with {jobId, action} and
  NO url -> the backend returns 400 "Missing crawl URL". The job therefore cannot be
  stopped from the UI and stays wedged in "harvesting" forever, blocking new jobs.
  This script is the immediate ops rescue while B2 lands the real backend control fix.

WHAT IT DOES
  Finds crawl_jobs (and optionally ingestion_jobs) that are wedged in a non-terminal
  state ("harvesting" / "queued" / "paused") whose worker is gone (dead/absent PID or
  stale heartbeat) and marks them "killed" with an audit log line, so the queue clears
  and a fresh job can start. It NEVER touches books / book_pages / libraries / curricula
  / subjects / users — only the *job-queue* documents.

SAFETY MODEL
  * Default run = DRY RUN. It only COUNTS and PRINTS; it writes nothing.
  * Every write goes through _safe_update(), which HARD-REFUSES any collection not on
    the explicit allowlist {crawl_jobs, ingestion_jobs}.
  * "Stale" = non-terminal status AND (no active_pid) OR (updated_at older than
    --stale-seconds, default 120s). Use --all to force-kill every non-terminal job
    regardless of heartbeat (owner judgement).
  * Content collections are out of scope by construction.

USAGE
  Report only (safe, default) — list stuck jobs and what WOULD be killed:
      python scripts/unstick_crawl_jobs.py

  Apply (mark the stale stuck jobs "killed", clearing the wedge):
      python scripts/unstick_crawl_jobs.py --apply

  Also sweep the ingestion_jobs queue:
      python scripts/unstick_crawl_jobs.py --apply --include-ingestion

  Force-kill EVERY non-terminal job (ignore heartbeat) — owner judgement:
      python scripts/unstick_crawl_jobs.py --apply --all

Connection: MONGODB_URI env, else agents.tools.get_mongodb_uri(), else
ignore/mongodb_secrets.json (same chain as emergency_sandbox_purge.py).
"""

import os
import sys
import time
import json
import argparse

import pymongo

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)
sys.path.insert(0, _ROOT)
sys.path.insert(0, os.path.join(_ROOT, "agents"))
try:
    from tools import get_mongodb_uri  # type: ignore
except Exception:
    try:
        from agents.tools import get_mongodb_uri  # type: ignore
    except Exception:
        def get_mongodb_uri(*_a, **_k):
            uri = os.environ.get("MONGODB_URI")
            if uri:
                return uri
            secrets = os.path.join(_ROOT, "ignore", "mongodb_secrets.json")
            if os.path.exists(secrets):
                with open(secrets, "r", encoding="utf-8") as f:
                    val = json.load(f).get("MONGODB_URI")
                    if val:
                        return val
            raise RuntimeError("No MONGODB_URI available (env / tools / ignore secrets all empty).")

# Only the job-queue collections may ever be written by this script.
_ALLOWLIST = {"crawl_jobs", "ingestion_jobs"}
# Non-terminal states that can wedge the queue.
_NON_TERMINAL = {"harvesting", "queued", "paused", "running", "processing"}


def _safe_update(collection, query, update, apply: bool):
    name = collection.name
    if name not in _ALLOWLIST:
        raise RuntimeError(f"REFUSING to write non-allowlisted collection '{name}'")
    if not apply:
        return collection.count_documents(query)
    res = collection.update_many(query, update)
    return res.modified_count


def _is_stale(job: dict, now: float, stale_seconds: int, force_all: bool) -> bool:
    if force_all:
        return True
    if job.get("active_pid") is None:
        return True
    last = job.get("updated_at") or job.get("created_at") or 0
    # updated_at is stored as epoch seconds in this codebase.
    return (now - float(last)) > stale_seconds


def _sweep(db, coll_name: str, now: float, args) -> None:
    coll = db[coll_name]
    stuck = list(coll.find({"status": {"$in": list(_NON_TERMINAL)}}))
    print(f"\n=== {coll_name} — {len(stuck)} non-terminal job(s) ===")
    if not stuck:
        print("  (queue clean — nothing wedged)")
        return

    to_kill = []
    for j in stuck:
        last = j.get("updated_at") or j.get("created_at") or 0
        age = int(now - float(last)) if last else -1
        stale = _is_stale(j, now, args.stale_seconds, args.all)
        flag = "STALE→kill" if stale else "live(skip)"
        print(f"  [{flag}] {j.get('_id')}  status={j.get('status')}  "
              f"pid={j.get('active_pid')}  age={age}s  url={str(j.get('url'))[:70]}")
        if stale:
            to_kill.append(j["_id"])

    if not to_kill:
        print("  No stale jobs to kill (all have a live heartbeat — use --all to force).")
        return

    ts = time.strftime("%H:%M:%S")
    update = {"$set": {
        "status": "killed",
        "updated_at": now,
    }, "$push": {
        "logs": f"[{ts}] [RESCUE] 🛑 Job force-killed by unstick_crawl_jobs.py (wedged; backend control 400)."
    }}
    n = _safe_update(coll, {"_id": {"$in": to_kill}}, update, args.apply)
    verb = "KILLED" if args.apply else "WOULD KILL"
    print(f"  → {verb} {len(to_kill)} job(s): {n} doc(s) {'updated' if args.apply else 'matched'}.")


def main():
    ap = argparse.ArgumentParser(description="Rescue wedged crawl/ingestion jobs (FC2.1).")
    ap.add_argument("--apply", action="store_true", help="Actually write (default: dry-run).")
    ap.add_argument("--include-ingestion", action="store_true", help="Also sweep ingestion_jobs.")
    ap.add_argument("--all", action="store_true", help="Force-kill EVERY non-terminal job (ignore heartbeat).")
    ap.add_argument("--stale-seconds", type=int, default=120, help="Heartbeat staleness threshold (default 120).")
    args = ap.parse_args()

    uri = get_mongodb_uri()
    client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=30000, connectTimeoutMS=30000)
    db_name = os.environ.get("ACTIVE_DB", "fahem")
    db = client[db_name]
    now = time.time()

    mode = "APPLY (writing)" if args.apply else "DRY-RUN (read-only)"
    print(f"unstick_crawl_jobs.py — db='{db_name}' — mode={mode} — "
          f"force_all={args.all} stale>{args.stale_seconds}s")

    _sweep(db, "crawl_jobs", now, args)
    if args.include_ingestion:
        _sweep(db, "ingestion_jobs", now, args)

    if not args.apply:
        print("\nDRY-RUN complete. Re-run with --apply (eyeball the counts first) to clear the wedge.")
    else:
        print("\nAPPLY complete. The queue should now accept a fresh job.")
    client.close()


if __name__ == "__main__":
    main()
