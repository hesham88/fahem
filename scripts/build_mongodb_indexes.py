#!/usr/bin/env python3
import os
import sys
from pymongo import MongoClient, ASCENDING, DESCENDING

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

# Build the SAME index set on prod and the demo sandbox so both behave identically (FC11: the
# sandbox mirrors the 5 prod books, so it needs the same hot-read indexes — esp. book_pages
# {book_id,page_number}, which was missing and forced a COLLSCAN+SORT on every page read).
TARGET_DBS = ["fahem", "fahem_sandbox"]


def _mk(coll, keys, **kw):
    """Create an index best-effort: log + continue so one collection's quirk (e.g. a sandbox unique
    conflict) never aborts the rest of the run."""
    try:
        name = coll.create_index(keys, **kw)
        print(f"  [+] {coll.name}: {name}")
    except Exception as e:
        print(f"  [!] {coll.name} {kw.get('name')}: {e}")


def _build_for_db(db, dbname):
    print(f"\n########## Building indexes for DB: {dbname} ##########")

    print("--- 1. users ---")
    _mk(db["users"], [("userId", ASCENDING)], unique=True, name="idx_userId_unique")
    _mk(db["users"], [("email", ASCENDING)], unique=True, sparse=True, name="idx_email_unique")
    _mk(db["users"], [("username_clean", ASCENDING)], unique=True, sparse=True, name="idx_username_clean_unique")

    print("--- 2. messages ---")
    _mk(db["messages"], [("senderId", ASCENDING), ("recipientId", ASCENDING), ("timestamp", ASCENDING)], name="idx_sender_recipient_timestamp")
    _mk(db["messages"], [("recipientId", ASCENDING), ("senderId", ASCENDING), ("timestamp", ASCENDING)], name="idx_recipient_sender_timestamp")

    print("--- 3. chat_sessions ---")
    _mk(db["chat_sessions"], [("userId", ASCENDING)], name="idx_chats_userId")

    print("--- 4. user_activities ---")
    _mk(db["user_activities"], [("userId", ASCENDING)], name="idx_activities_userId")
    # FC9.16: the hot reads sort by timestamp desc (per-user history + global audit). Without
    # these the sort is an in-memory SORT (global one a full scan risking the 32MB sort cap).
    _mk(db["user_activities"], [("userId", ASCENDING), ("timestamp", DESCENDING)], name="idx_activities_userId_ts")
    _mk(db["user_activities"], [("timestamp", DESCENDING)], name="idx_activities_ts")
    # FC9.14: serves the action-filtered history read (practice/zatona).
    _mk(db["user_activities"], [("userId", ASCENDING), ("action", ASCENDING), ("timestamp", DESCENDING)], name="idx_activities_userId_action_ts")

    print("--- 5. token_telemetry ---")
    _mk(db["token_telemetry"], [("userId", ASCENDING)], name="idx_telemetry_userId")

    print("--- 6. curriculum collections ---")
    _mk(db["libraries"], [("_id", ASCENDING)], unique=True, name="idx_lib_id")
    _mk(db["curricula"], [("library_id", ASCENDING)], name="idx_cur_libraryId")
    _mk(db["curricula"], [("scope.grade", ASCENDING), ("scope.term", ASCENDING)], name="idx_cur_scope_grade_term")
    _mk(db["curricula"], [("visibility", ASCENDING), ("owner_uid", ASCENDING)], name="idx_cur_visibility_owner")
    _mk(db["subjects"], [("curriculum_id", ASCENDING)], name="idx_subj_curriculumId")
    _mk(db["subjects"], [("category", ASCENDING)], name="idx_subj_category")
    _mk(db["subjects"], [("curriculum_id", ASCENDING), ("slug", ASCENDING)], unique=True, name="idx_subj_curriculum_slug_unique")
    try:
        db["subjects"].drop_index("name_1")
        print("  dropped legacy non-unique 'name_1' on subjects")
    except Exception:
        pass

    print("--- 7. books / book_pages ---")
    _mk(db["books"], [("curriculum_id", ASCENDING), ("subject_id", ASCENDING), ("role", ASCENDING)], name="idx_book_curriculum_subject_role")
    _mk(db["books"], [("visibility", ASCENDING), ("owner_uid", ASCENDING)], name="idx_book_visibility_owner")
    _mk(db["books"], [("subject_id", ASCENDING)], name="idx_book_subjectId")
    # FC11.4: the book-page-viewer hot read is find({book_id}).sort(page_number); without this
    # compound index it was a full COLLSCAN + in-memory SORT over every embedding-bearing page doc.
    _mk(db["book_pages"], [("book_id", ASCENDING), ("page_number", ASCENDING)], name="idx_pages_book_number")

    print(f"--- summary for {dbname} ---")
    for col in ["users", "messages", "chat_sessions", "user_activities", "token_telemetry",
                "libraries", "curricula", "subjects", "books", "book_pages"]:
        if col in db.list_collection_names():
            names = [i["name"] for i in db[col].list_indexes()]
            print(f"  {col}: {names}")


def build_indexes():
    uri = get_mongodb_uri()
    masked = ("mongodb://***:***@" + uri.split("@")[-1]) if "@" in uri else uri
    print(f"Connecting with URI: {masked}")
    try:
        client = MongoClient(uri)
        for dbname in TARGET_DBS:
            _build_for_db(client[dbname], dbname)
        print("\nDatabase Schema Index Tuning completed for all target DBs! 🚀")
    except Exception as e:
        print(f"Error during index building: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    build_indexes()
