import os, time, sys, pymongo

# Ensure we can import from agents folder
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "agents"))

try:
    from tools import get_mongodb_uri
except ImportError:
    try:
        from agents.tools import get_mongodb_uri
    except ImportError:
        def get_mongodb_uri(read_only=False):
            return os.environ.get("MONGODB_URI", "mongodb://localhost:27017")

# Prioritize os.environ["MONGODB_URI"] if it exists, otherwise fall back to get_mongodb_uri()
uri = os.environ.get("MONGODB_URI") or get_mongodb_uri()

cli = pymongo.MongoClient(uri)
cutoff = int(time.time()) - 300            # 5 minutes
for dbname in ("fahem", "fahem_sandbox"):
    col = cli[dbname]["demo_sessions"]
    
    # Rerun the count before cleanup for reporting
    active_before = col.count_documents({"status": "active"})
    expired_before = col.count_documents({"status": {"$in": ["expired", "ended", "killed"]}})
    total_before = col.count_documents({})
    
    exp = col.update_many({"status": "active", "started_at": {"$lt": cutoff}},
                          {"$set": {"status": "expired", "ended_at": int(time.time()),
                                    "kill_reason": "backlog cleanup"}})
    old = col.delete_many({"status": {"$in": ["expired", "ended", "killed"]},
                           "started_at": {"$lt": int(time.time()) - 86400}})
    
    active_after = col.count_documents({"status": "active"})
    total_after = col.count_documents({})
    
    print(f"{dbname} BEFORE: {active_before} active, {expired_before} expired/ended/killed, {total_before} total")
    print(f"{dbname}: expired {exp.modified_count} active, deleted {old.deleted_count} old")
    print(f"{dbname} AFTER: {active_after} active, {total_after} total")
