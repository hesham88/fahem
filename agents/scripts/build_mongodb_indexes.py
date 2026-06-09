#!/usr/bin/env python3
import os
import sys
from pymongo import MongoClient, ASCENDING

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

def build_indexes():
    print("Fetching MongoDB connection string...")
    uri = get_mongodb_uri()
    
    # Hide credential part for secure logging
    if "@" in uri:
        parts = uri.split("@")
        masked_uri = "mongodb://***:***@" + parts[-1]
    else:
        masked_uri = uri
    print(f"Connecting to database with URI: {masked_uri}")
    
    try:
        client = MongoClient(uri)
        db = client["fahem"]
        
        print("\n--- 1. Tuning 'users' Collection Indexes ---")
        # Ensure userId has an ascending index and is unique
        users_idx = db["users"].create_index([("userId", ASCENDING)], unique=True, name="idx_userId_unique")
        print(f"Created index on 'users' (userId): {users_idx}")
        
        # Ensure email and username_clean have unique, sparse indexes
        email_idx = db["users"].create_index([("email", ASCENDING)], unique=True, sparse=True, name="idx_email_unique")
        print(f"Created unique sparse index on 'users' (email): {email_idx}")
        
        username_idx = db["users"].create_index([("username_clean", ASCENDING)], unique=True, sparse=True, name="idx_username_clean_unique")
        print(f"Created unique sparse index on 'users' (username_clean): {username_idx}")
        
        print("\n--- 2. Tuning 'messages' Collection Indexes ---")
        # Build composite index on senderId and recipientId for fast chat retrieval
        msg_idx1 = db["messages"].create_index(
            [("senderId", ASCENDING), ("recipientId", ASCENDING), ("timestamp", ASCENDING)],
            name="idx_sender_recipient_timestamp"
        )
        msg_idx2 = db["messages"].create_index(
            [("recipientId", ASCENDING), ("senderId", ASCENDING), ("timestamp", ASCENDING)],
            name="idx_recipient_sender_timestamp"
        )
        print(f"Created index on 'messages' (sender -> recipient): {msg_idx1}")
        print(f"Created index on 'messages' (recipient -> sender): {msg_idx2}")
        
        print("\n--- 3. Tuning 'chat_sessions' Collection Indexes ---")
        chat_idx = db["chat_sessions"].create_index([("userId", ASCENDING)], name="idx_chats_userId")
        print(f"Created index on 'chat_sessions': {chat_idx}")
        
        print("\n--- 4. Tuning 'user_activities' Collection Indexes ---")
        act_idx = db["user_activities"].create_index([("userId", ASCENDING)], name="idx_activities_userId")
        print(f"Created index on 'user_activities': {act_idx}")
        
        print("\n--- 5. Tuning 'token_telemetry' Collection Indexes ---")
        telemetry_idx = db["token_telemetry"].create_index([("userId", ASCENDING)], name="idx_telemetry_userId")
        print(f"Created index on 'token_telemetry': {telemetry_idx}")
        
        print("\n--- 6. Tuning Phase 1 Curriculum Collections Indexes ---")
        lib_idx = db["libraries"].create_index([("_id", ASCENDING)], unique=True, name="idx_lib_id")
        print(f"Created unique index on 'libraries' (_id): {lib_idx}")
        
        cur_idx1 = db["curricula"].create_index([("library_id", ASCENDING)], name="idx_cur_libraryId")
        cur_idx2 = db["curricula"].create_index([("scope.grade", ASCENDING), ("scope.term", ASCENDING)], name="idx_cur_scope_grade_term")
        cur_idx3 = db["curricula"].create_index([("visibility", ASCENDING), ("owner_uid", ASCENDING)], name="idx_cur_visibility_owner")
        print(f"Created indexes on 'curricula': {cur_idx1}, {cur_idx2}, {cur_idx3}")
        
        subj_idx1 = db["subjects"].create_index([("curriculum_id", ASCENDING)], name="idx_subj_curriculumId")
        subj_idx2 = db["subjects"].create_index([("category", ASCENDING)], name="idx_subj_category")
        subj_idx3 = db["subjects"].create_index([("curriculum_id", ASCENDING), ("slug", ASCENDING)], unique=True, name="idx_subj_curriculum_slug_unique")
        try:
            db["subjects"].drop_index("name_1")
            print("Dropped legacy non-unique index 'name_1' on 'subjects'")
        except Exception:
            pass
        print(f"Created indexes on 'subjects': {subj_idx1}, {subj_idx2}, {subj_idx3}")
        
        book_idx1 = db["books"].create_index(
            [("curriculum_id", ASCENDING), ("subject_id", ASCENDING), ("role", ASCENDING)],
            name="idx_book_curriculum_subject_role"
        )
        book_idx2 = db["books"].create_index([("visibility", ASCENDING), ("owner_uid", ASCENDING)], name="idx_book_visibility_owner")
        book_idx3 = db["books"].create_index([("subject_id", ASCENDING)], name="idx_book_subjectId")
        print(f"Created indexes on 'books': {book_idx1}, {book_idx2}, {book_idx3}")
        
        pages_idx = db["book_pages"].create_index([("book_id", ASCENDING), ("page_number", ASCENDING)], name="idx_pages_book_number")
        print(f"Created index on 'book_pages' (book_id + page_number): {pages_idx}")
        
        print("\n=== INDEX TUNING SUMMARY ===")
        target_cols = [
            "users", "messages", "chat_sessions", "user_activities", "token_telemetry",
            "libraries", "curricula", "subjects", "books", "book_pages"
        ]
        for col in target_cols:
            print(f"Indexes on '{col}':")
            if col in db.list_collection_names():
                for index in db[col].list_indexes():
                    print(f"  - {index['name']}: {index['key'].to_dict()}")
            else:
                print("  - [Collection not created yet]")
                
        print("\nDatabase Schema Index Tuning completed successfully! 🚀")
        
    except Exception as e:
        print(f"Error during index building: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    build_indexes()
