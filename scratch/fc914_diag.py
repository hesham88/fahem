"""FC9.14 prod diagnosis — confirm whether a malformed user_activities doc makes the
strict-schema read return []. Prints ONLY counts + which required fields are missing.
Never prints the URI, emails, uids, or any activity content (PII-safe)."""
import os, sys

uri = os.environ.get("MONGO_URI", "").strip()
if not uri:
    print("MONGO_URI env not set"); sys.exit(1)
from pymongo import MongoClient
cli = MongoClient(uri, serverSelectionTimeoutMS=8000)
REQUIRED = ["userId", "userEmail", "action", "status"]
for dbname in ["fahem", "fahem_sandbox"]:
    db = cli[dbname]
    col = db["user_activities"]
    try:
        total = col.count_documents({})
    except Exception as e:
        print(f"[{dbname}] count failed: {e}")
        continue
    print(f"[{dbname}] user_activities total = {total}")
    if total == 0:
        continue
    for f in REQUIRED:
        missing = col.count_documents({"$or": [{f: {"$exists": False}}, {f: None}]})
        if missing:
            print(f"[{dbname}]   docs missing/null '{f}' = {missing}  <-- would crash strict schema")
    # distinct actions present (no PII)
    try:
        acts = col.distinct("action")
        print(f"[{dbname}]   distinct actions = {acts}")
    except Exception as e:
        print(f"[{dbname}]   distinct actions failed: {e}")
print("DONE")
