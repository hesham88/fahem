#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Merges production metadata from temp/prod_dump.json into web/src/app/api/local_db.json
to keep local environment fully synchronized with the live production database.
"""

import os
import json
import sys

LOCAL_DB_PATH = "C:/Users/hesh1/Desktop/fahem/web/src/app/api/local_db.json"
PROD_DUMP_PATH = "C:/Users/hesh1/Desktop/fahem/temp/prod_dump.json"

def main():
    print("==================================================")
    print("[MERGE] Merging Prod Dump into local_db.json")
    print("==================================================")
    
    if not os.path.exists(LOCAL_DB_PATH):
        print(f"[MERGE][FAIL] Local database file not found: {LOCAL_DB_PATH}")
        sys.exit(1)
        
    if not os.path.exists(PROD_DUMP_PATH):
        print(f"[MERGE][FAIL] Production dump file not found: {PROD_DUMP_PATH}")
        sys.exit(1)
        
    print(f"[MERGE] Loading local DB from {LOCAL_DB_PATH}...")
    with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
        local_db = json.load(f)
        
    print(f"[MERGE] Loading production dump from {PROD_DUMP_PATH}...")
    with open(PROD_DUMP_PATH, "r", encoding="utf-8") as f:
        prod_dump = json.load(f)
        
    keys_to_merge = ["libraries", "curricula", "subjects", "books"]
    
    for key in keys_to_merge:
        local_list = local_db.get(key, [])
        prod_list = prod_dump.get(key, [])
        
        # Build dictionary of existing local items
        merged_dict = {item["_id"]: item for item in local_list}
        
        # Add or overwrite with production dump items
        for prod_item in prod_list:
            merged_dict[prod_item["_id"]] = prod_item
            
        local_db[key] = list(merged_dict.values())
        print(f"  - {key}: local had {len(local_list)}, prod had {len(prod_list)}, merged result has {len(local_db[key])}")
        
    print(f"[MERGE] Writing merged local DB back to {LOCAL_DB_PATH}...")
    with open(LOCAL_DB_PATH, "w", encoding="utf-8") as f:
        json.dump(local_db, f, indent=2, ensure_ascii=False)
        
    print("[MERGE][SUCCESS] Merging completed successfully!")

if __name__ == "__main__":
    main()
