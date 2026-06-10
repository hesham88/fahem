#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
emergency_sandbox_purge.py  —  Owner-run emergency cleanup (bible spec FC.A1).

WHAT IT DOES
  1. Kills ALL live demo sessions now (status -> "killed" in fahem + fahem_sandbox).
     Status IS the revoke mechanism: once verifyDemoToken fails-closed (B1/FC.A3),
     a "killed" session 401s on its next request. This update is non-destructive.
  2. Purges each killed session's sandbox-tagged docs back to the seed baseline
     (fahem_sandbox ONLY) using the same collection list the live kill endpoint uses.
  3. Clears the crawler + ingestion JOB QUEUES (crawl_jobs, ingestion_jobs) for a
     fresh start --- sandbox by default; prod only behind an explicit flag.
  4. (Guarded) Cleans the leaked demo audit docs (demo_sessions/demo_activities)
     out of PROD `fahem` --- the 508-doc cross-DB leak. Prod deletes require an
     explicit flag AND the --i-understand-prod-delete confirmation token.

SAFETY MODEL
  * Default run = DRY RUN. It only COUNTS and PRINTS; it writes nothing.
  * Every delete goes through _safe_delete(), which HARD-REFUSES to touch any
    collection in prod `fahem` that is not on an explicit per-operation allowlist.
  * It NEVER deletes books, book_pages, libraries, curricula, subjects, or real
    users. Content is out of scope by construction.
  * Sandbox deletes assert db.name == "fahem_sandbox" before executing.

USAGE
  Report only (safe, default):
      python scripts/emergency_sandbox_purge.py

  Apply the SANDBOX-SAFE ops (kill sessions + purge sandbox docs + clear SANDBOX jobs):
      python scripts/emergency_sandbox_purge.py --apply

  Also clear the PROD job queues (crawl_jobs/ingestion_jobs in `fahem`):
      python scripts/emergency_sandbox_purge.py --apply --clear-prod-jobs --i-understand-prod-delete

  Also remove the leaked demo audit docs from PROD `fahem`:
      python scripts/emergency_sandbox_purge.py --apply --purge-prod-demo --i-understand-prod-delete

Connection: MONGODB_URI env, else agents.tools.get_mongodb_uri(), else
ignore/mongodb_secrets.json (same chain as the rest of the codebase).
"""

import os
import sys
import time
import argparse
import socket

# Allow PyMongo to resolve MongoDB Atlas replica set hosts naturally using DNS


import pymongo

# --- import the project's URI resolver (same chain cleanup_demo_sessions.py uses) ---
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
            import json
            secrets = os.path.join(_ROOT, "ignore", "mongodb_secrets.json")
            if os.path.exists(secrets):
                with open(secrets, "r", encoding="utf-8") as f:
                    val = json.load(f).get("MONGODB_URI")
                    if val:
                        return val
            return "mongodb://localhost:27017"

PROD_DB = "fahem"
SANDBOX_DB = "fahem_sandbox"

# Collections we are EVER allowed to delete from in prod `fahem`, per operation.
# Anything not listed here is hard-refused on the prod DB.
PROD_ALLOW_DEMO = {"demo_sessions", "demo_activities"}   # the leak cleanup
PROD_ALLOW_JOBS = {"crawl_jobs", "ingestion_jobs"}        # the queue reset

# Per-session sandbox purge map (mirrors the live kill endpoint in services.py).
# Tuples of (collection, [field-queries keyed by the session uid/email]).
SANDBOX_PURGE_FIELDS = [
    ("users", ("userId", "email")),
    ("user_profiles", ("userId", "email")),
    ("messages", ("userId", "senderId")),
    ("threads", ("userId", "creatorId")),
    ("social_threads", ("userId", "creatorId", "authorId")),
    ("social_replies", ("userId", "authorId")),
    ("companion_facts", ("userId",)),
    ("companion_memories", ("userId",)),
    ("active_practice_sessions", ("userId",)),
    ("demo_activities", ("userId",)),
    ("reading_sessions", ("userId",)),
    ("user_activities", ("userId",)),
    ("notifications", ("recipient_uid", "userId")),
]


class Guard:
    """Centralizes the dry-run flag and every destructive-op safety assertion."""

    def __init__(self, apply_changes: bool):
        self.apply = apply_changes
        self.deleted = 0
        self.updated = 0

    def _refuse_unless_allowed(self, db_name: str, collection: str, prod_allow: set):
        if db_name == PROD_DB and collection not in prod_allow:
            raise RuntimeError(
                f"REFUSED: delete on prod `{db_name}.{collection}` is not on the "
                f"allowlist {sorted(prod_allow)}. Aborting to protect production."
            )
        if db_name not in (PROD_DB, SANDBOX_DB):
            raise RuntimeError(f"REFUSED: unexpected database `{db_name}`.")

    def safe_delete(self, db, collection: str, query: dict, prod_allow: set, label: str):
        db_name = db.name
        self._refuse_unless_allowed(db_name, collection, prod_allow)
        col = db[collection]
        n = col.count_documents(query)
        if n == 0:
            return 0
        if not self.apply:
            print(f"  [DRY-RUN] would delete {n:>6} from {db_name}.{collection}  ({label})")
            return n
        res = col.delete_many(query)
        self.deleted += res.deleted_count
        print(f"  [DELETED] {res.deleted_count:>6} from {db_name}.{collection}  ({label})")
        return res.deleted_count

    def safe_update(self, db, collection: str, query: dict, update: dict, label: str):
        # Status updates are non-destructive but still gated by the apply flag.
        col = db[collection]
        n = col.count_documents(query)
        if n == 0:
            return 0
        if not self.apply:
            print(f"  [DRY-RUN] would update {n:>6} in {db.name}.{collection}  ({label})")
            return n
        res = col.update_many(query, update)
        self.updated += res.modified_count
        print(f"  [UPDATED] {res.modified_count:>6} in {db.name}.{collection}  ({label})")
        return res.modified_count


def kill_all_active_sessions(client, guard: Guard):
    print("\n[1] Kill ALL live demo sessions (status -> killed, both DBs)")
    now = int(time.time())
    update = {"$set": {"status": "killed", "ended_at": now,
                       "kill_reason": "emergency_sandbox_purge"}}
    active_q = {"status": {"$nin": ["killed", "ended", "expired"]}}
    # Collect uids BEFORE flipping status, so we can purge their sandbox docs after.
    uids = set()
    emails = set()
    for db_name in (PROD_DB, SANDBOX_DB):
        for s in client[db_name]["demo_sessions"].find(active_q, {"uid": 1, "email": 1}):
            if s.get("uid"):
                uids.add(s["uid"])
            if s.get("email"):
                emails.add(s["email"])
        guard.safe_update(client[db_name], "demo_sessions", active_q, update,
                          "live -> killed")
    return uids, emails


def purge_sandbox_session_docs(client, guard: Guard, uids: set, emails: set):
    print("\n[2] Purge killed sessions' sandbox-tagged docs (fahem_sandbox ONLY)")
    sandbox = client[SANDBOX_DB]
    assert sandbox.name == SANDBOX_DB, "sandbox guard: refusing to purge a non-sandbox DB"
    if not uids and not emails:
        print("  (no session uids to purge)")
        return
    for collection, fields in SANDBOX_PURGE_FIELDS:
        ors = []
        for f in fields:
            vals = emails if f == "email" else uids
            for v in vals:
                ors.append({f: v})
        if not ors:
            continue
        guard.safe_delete(sandbox, collection, {"$or": ors}, prod_allow=set(),
                          label="session-tagged purge")


def clear_job_queues(client, guard: Guard, include_prod_jobs: bool):
    print("\n[3] Clear crawler + ingestion job queues (fresh start)")
    dbs = [SANDBOX_DB] + ([PROD_DB] if include_prod_jobs else [])
    for db_name in dbs:
        for collection in ("crawl_jobs", "ingestion_jobs"):
            guard.safe_delete(client[db_name], collection, {},
                              prod_allow=PROD_ALLOW_JOBS, label="job-queue reset")
    if not include_prod_jobs:
        # Report prod job counts so the owner can decide.
        for collection in ("crawl_jobs", "ingestion_jobs"):
            n = client[PROD_DB][collection].count_documents({})
            if n:
                print(f"  [INFO] prod {PROD_DB}.{collection} holds {n} docs "
                      f"(pass --clear-prod-jobs --i-understand-prod-delete to clear)")


def purge_prod_demo_leak(client, guard: Guard, enabled: bool):
    print("\n[4] Prod demo-audit leak cleanup (fahem.demo_sessions / demo_activities)")
    for collection in ("demo_sessions", "demo_activities"):
        n = client[PROD_DB][collection].count_documents({})
        print(f"  [INFO] prod {PROD_DB}.{collection} holds {n} docs")
    if not enabled:
        print("  (skipped --- pass --purge-prod-demo --i-understand-prod-delete to remove)")
        return
    for collection in ("demo_sessions", "demo_activities"):
        guard.safe_delete(client[PROD_DB], collection, {},
                          prod_allow=PROD_ALLOW_DEMO, label="prod leak cleanup")


def report_monitor_state(client, when: str):
    print(f"\n=== Demo monitor state ({when}) ===")
    for db_name in (PROD_DB, SANDBOX_DB):
        col = client[db_name]["demo_sessions"]
        total = col.count_documents({})
        active = col.count_documents({"status": {"$nin": ["killed", "ended", "expired"]}})
        print(f"  {db_name}.demo_sessions: {active} active / {total} total")
    for db_name in (PROD_DB, SANDBOX_DB):
        cj = client[db_name]["crawl_jobs"].count_documents({})
        ij = client[db_name]["ingestion_jobs"].count_documents({})
        print(f"  {db_name}: crawl_jobs={cj}  ingestion_jobs={ij}")


def main():
    ap = argparse.ArgumentParser(description="Emergency sandbox/session/job purge (FC.A1).")
    ap.add_argument("--apply", action="store_true",
                    help="Perform the changes. Without it, this is a DRY RUN (counts only).")
    ap.add_argument("--clear-prod-jobs", action="store_true",
                    help="Also clear crawl_jobs/ingestion_jobs in prod `fahem`.")
    ap.add_argument("--purge-prod-demo", action="store_true",
                    help="Also delete leaked demo_sessions/demo_activities from prod `fahem`.")
    ap.add_argument("--i-understand-prod-delete", action="store_true",
                    help="Required confirmation token for ANY prod `fahem` deletion.")
    args = ap.parse_args()

    prod_delete_requested = args.clear_prod_jobs or args.purge_prod_demo
    if prod_delete_requested and not args.i_understand_prod_delete:
        print("ERROR: a prod-delete flag was passed without --i-understand-prod-delete. Aborting.")
        sys.exit(2)
    if prod_delete_requested and not args.apply:
        print("ERROR: prod-delete flags require --apply (they do nothing in a dry run). Aborting.")
        sys.exit(2)

    mode = "APPLY" if args.apply else "DRY-RUN (no writes)"
    print(f"emergency_sandbox_purge.py --- mode: {mode}")
    print(f"prod-job-clear: {args.clear_prod_jobs} | prod-demo-purge: {args.purge_prod_demo}")

    uri = os.environ.get("MONGODB_URI") or get_mongodb_uri()
    client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=8000)
    # Fail fast if the cluster is unreachable.
    client.admin.command("ping")

    guard = Guard(apply_changes=args.apply)

    report_monitor_state(client, "before")

    uids, emails = kill_all_active_sessions(client, guard)
    purge_sandbox_session_docs(client, guard, uids, emails)
    clear_job_queues(client, guard, include_prod_jobs=args.clear_prod_jobs)
    purge_prod_demo_leak(client, guard, enabled=args.purge_prod_demo)

    report_monitor_state(client, "after" if args.apply else "after (unchanged --- dry run)")

    print("\n=== Summary ===")
    print(f"  sessions updated (->killed): {guard.updated}")
    print(f"  docs deleted:                {guard.deleted}")
    if not args.apply:
        print("  NOTE: dry run --- nothing was written. Re-run with --apply to execute.")
    client.close()


if __name__ == "__main__":
    main()
