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
        print(f"Created index on 'users': {users_idx}")
        
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
        
        print("\n=== INDEX TUNING SUMMARY ===")
        for col in ["users", "messages", "chat_sessions", "user_activities", "token_telemetry"]:
            print(f"Indexes on '{col}':")
            for index in db[col].list_indexes():
                print(f"  - {index['name']}: {index['key'].to_dict()}")
                
        print("\nDatabase Schema Index Tuning completed successfully! 🚀")
        
    except Exception as e:
        print(f"Error during index building: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    build_indexes()
