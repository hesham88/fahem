#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
delete_moe_library.py — CASCADE-delete the MOE (Egyptian Ministry of Education) library and
everything beneath it: curricula -> subjects -> books -> book_pages, plus MOE crawl jobs.

SAFE BY DEFAULT: dry-run (counts only). Pass --confirm to actually delete.
Scope is strictly MOE: identified by library `_id == "lib_moe"` OR `source == "moe"`,
and anything whose URLs point at moe.gov.eg. NEVER touches OpenStax or other libraries,
NEVER drops a database, NEVER deletes by an empty filter.

Usage:
  python scripts/delete_moe_library.py                 # dry-run on fahem + fahem_sandbox
  python scripts/delete_moe_library.py --confirm       # actually delete
  python scripts/delete_moe_library.py --db fahem      # one DB only
Requires MONGODB_URI in the environment (the same Secret-Manager URI the backend uses).
"""
import os
import sys
import pymongo

CONFIRM = "--confirm" in sys.argv
DBS = ["fahem", "fahem_sandbox"]
for i, a in enumerate(sys.argv):
    if a == "--db" and i + 1 < len(sys.argv):
        DBS = [sys.argv[i + 1]]

MOE_LIB_IDS = {"lib_moe"}
MOE_URL_HINT = "moe.gov.eg"


def cascade(db, name):
    print(f"\n=== {name} ===")
    # 1. MOE libraries (by id or source)
    libs = list(db.libraries.find({"$or": [{"_id": {"$in": list(MOE_LIB_IDS)}}, {"source": "moe"}]}))
    lib_ids = {l["_id"] for l in libs} | MOE_LIB_IDS
    print(f"libraries (MOE): {len(libs)} -> {sorted(str(x) for x in lib_ids)}")

    # 2. curricula under those libraries
    curricula = list(db.curricula.find({"library_id": {"$in": list(lib_ids)}}))
    cur_ids = {c["_id"] for c in curricula}
    print(f"curricula: {len(curricula)}")

    # 3. subjects under those curricula
    subjects = list(db.subjects.find({"curriculum_id": {"$in": list(cur_ids)}})) if cur_ids else []
    subj_ids = {s["_id"] for s in subjects}
    print(f"subjects: {len(subjects)}")

    # 4. books by library OR curriculum OR subject
    book_filter = {"$or": [
        {"library_id": {"$in": list(lib_ids)}},
        {"curriculum_id": {"$in": list(cur_ids)}} if cur_ids else {"_id": "__none__"},
        {"subject_id": {"$in": list(subj_ids)}} if subj_ids else {"_id": "__none__"},
    ]}
    books = list(db.books.find(book_filter))
    book_ids = {b["_id"] for b in books}
    print(f"books: {len(books)}")

    # 5. book_pages of those books
    pages_n = db.book_pages.count_documents({"book_id": {"$in": list(book_ids)}}) if book_ids else 0
    print(f"book_pages: {pages_n}")

    # 6. MOE crawl jobs (by url hint)
    crawl_n = db.crawl_jobs.count_documents({"$or": [
        {"url": {"$regex": MOE_URL_HINT, "$options": "i"}},
        {"source_url": {"$regex": MOE_URL_HINT, "$options": "i"}},
        {"library_id": {"$in": list(lib_ids)}},
    ]}) if "crawl_jobs" in db.list_collection_names() else 0
    print(f"crawl_jobs (MOE): {crawl_n}")

    if not CONFIRM:
        print("[DRY-RUN] nothing deleted. Re-run with --confirm to cascade-delete the above.")
        return

    # --- DELETE in dependency order (children first). Each filter is non-empty & MOE-scoped. ---
    if book_ids:
        print("deleted book_pages:", db.book_pages.delete_many({"book_id": {"$in": list(book_ids)}}).deleted_count)
        print("deleted books:", db.books.delete_many({"_id": {"$in": list(book_ids)}}).deleted_count)
    if subj_ids:
        print("deleted subjects:", db.subjects.delete_many({"_id": {"$in": list(subj_ids)}}).deleted_count)
    if cur_ids:
        print("deleted curricula:", db.curricula.delete_many({"_id": {"$in": list(cur_ids)}}).deleted_count)
    if lib_ids:
        print("deleted libraries:", db.libraries.delete_many({"_id": {"$in": list(lib_ids)}}).deleted_count)
    if crawl_n and "crawl_jobs" in db.list_collection_names():
        print("deleted crawl_jobs:", db.crawl_jobs.delete_many({"$or": [
            {"url": {"$regex": MOE_URL_HINT, "$options": "i"}},
            {"source_url": {"$regex": MOE_URL_HINT, "$options": "i"}},
            {"library_id": {"$in": list(lib_ids)}},
        ]}).deleted_count)


# --- import the project's URI resolver ---
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


def main():
    uri = os.environ.get("MONGODB_URI") or get_mongodb_uri()
    if not uri:
        print("ERROR: MONGODB_URI not set (use the backend's Secret-Manager URI / run inside the VPC).")
        sys.exit(1)
    cli = pymongo.MongoClient(uri)
    print(f"MODE: {'DELETE (--confirm)' if CONFIRM else 'DRY-RUN'} | DBs: {DBS}")
    for dbname in DBS:
        cascade(cli[dbname], dbname)
    print("\nDone. (OpenStax and all non-MOE libraries untouched.)")


if __name__ == "__main__":
    main()
