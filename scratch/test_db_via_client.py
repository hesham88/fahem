import os
import sys
from pymongo import MongoClient

def main():
    uri = "mongodb+srv://fahem_mcp:60Ze1dDbPPqFVAhG@fahemcluster.trf718.mongodb.net/?appName=FahemCluster"
    print("Attempting to connect with manually resolved public URI:", uri.split("@")[-1] if "@" in uri else uri)
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=10000)
        # Verify connection
        client.admin.command('ping')
        print("Success! MongoDB connection established successfully.")
        
        db = client["fahem"]
        cols = db.list_collection_names()
        print("Success! Collections in 'fahem':", cols)
        
        col = db["companion_sessions"]
        doc_count = col.count_documents({})
        print(f"Total companion sessions: {doc_count}")
        
        # Let's inspect the largest session
        sessions = list(col.find({}))
        if not sessions:
            print("No sessions found in companion_sessions!")
            return
            
        print("\nSession Overview:")
        for s in sessions:
            sid = s.get("id")
            uid = s.get("user_id")
            events = s.get("events", [])
            # calculate serialized size
            import json
            from bson import json_util
            serialized = json.dumps(s, default=json_util.default)
            size_kb = len(serialized) / 1024.0
            print(f"- Session {sid} | User {uid} | Events {len(events)} | Size {size_kb:.2f} KB")
            
            # Let's print detailed event sizes
            if len(events) > 0:
                print("  Events breakdown:")
                for i, ev in enumerate(events):
                    ev_serialized = json.dumps(ev, default=json_util.default)
                    ev_size_kb = len(ev_serialized) / 1024.0
                    inv_id = ev.get("invocation_id", "N/A")
                    partial = ev.get("partial", False)
                    print(f"    Event {i}: invocation_id={inv_id} | size={ev_size_kb:.2f} KB | partial={partial}")
                    content = ev.get("content", {})
                    if content:
                        parts = content.get("parts", [])
                        print(f"      Parts count: {len(parts)}")
                        for j, p in enumerate(parts):
                            p_keys = list(p.keys())
                            p_size = len(json.dumps(p, default=json_util.default)) / 1024.0
                            print(f"        Part {j}: keys={p_keys} | size={p_size:.2f} KB")
                            # If there's text or function response
                            if "text" in p:
                                text_val = p["text"]
                                print(f"          text (first 100 chars): {repr(text_val[:100])}")
                            if "function_response" in p:
                                fr = p["function_response"]
                                fr_name = fr.get("name")
                                fr_resp = fr.get("response")
                                resp_str = json.dumps(fr_resp, default=json_util.default)
                                print(f"          function_response name={fr_name} | response_size={len(resp_str)/1024.0:.2f} KB")
                            if "function_call" in p:
                                fc = p["function_call"]
                                fc_name = fc.get("name")
                                fc_args = fc.get("args")
                                args_str = json.dumps(fc_args, default=json_util.default)
                                print(f"          function_call name={fc_name} | args_size={len(args_str)/1024.0:.2f} KB")
                                if len(args_str) > 200:
                                    print(f"            args snippet: {repr(args_str[:200])}")

    except Exception as e:
        print("An error occurred during DB operations:", e)

if __name__ == "__main__":
    main()
