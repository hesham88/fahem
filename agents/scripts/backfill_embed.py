#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
One-time backfill script to re-embed any pages lacking embed_provenance="api"
or containing legacy fallback noise embeddings.
Ensures early validation, correct dimension alignment (3072), and idempotency.
Optimized to avoid disk I/O bottlenecks by batching writes at the end.
"""

import os
import sys
import io
import time
import json
import random
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add agents/ingestion_v2 to path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, os.path.join(ROOT_DIR, "agents", "ingestion_v2"))

from utils import (
    get_gemini_config, get_gemini_embedding_v2, is_mongodb_enabled,
    get_mongodb_uri, LOCAL_DB_PATH, atomic_write_json, EMBED_MODEL, EMBED_DIM
)

def get_heading_path(blocks):
    """
    Builds a path prefix (e.g. "Ch1 › 1.2 Setup › ") from active headings in blocks.
    """
    headings = []
    for b in blocks:
        if b.get("type") == "heading":
            headings.append(b.get("text", ""))
    if headings:
        return " › ".join(headings[:3]) + " › "
    return ""

def construct_page_text(p_doc):
    blocks = p_doc.get("blocks", [])
    chunk_texts = []
    for b in blocks:
        b_type = b.get("type")
        if b_type == "paragraph" and b.get("text"):
            chunk_texts.append(b["text"])
        elif b_type == "heading" and b.get("text"):
            chunk_texts.append(b["text"])
        elif b_type == "definition":
            chunk_texts.append(f"{b.get('term')}: {b.get('text')}")
        elif b_type == "question":
            chunk_texts.append(f"{b.get('prompt')} Options: " + ", ".join(b.get("options", [])))
        elif b_type == "callout":
            chunk_texts.append(f"{b.get('label')} - {b.get('title')}")
            
    raw_joined_text = " ".join(chunk_texts)
    heading_path = get_heading_path(blocks)
    return f"{heading_path}{raw_joined_text}" if raw_joined_text else f"Page {p_doc.get('page_number')}"

def load_all_suspect_pages(is_local):
    """
    Loads all pages where embed_provenance is not "api".
    """
    suspect_pages = []
    all_pages_count = 0
    
    if is_local or not is_mongodb_enabled():
        print(f"[BACKFILL] Loading pages from local database: {LOCAL_DB_PATH}")
        if os.path.exists(LOCAL_DB_PATH):
            try:
                with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                    db = json.load(f)
                all_pages = db.get("book_pages", [])
                all_pages_count = len(all_pages)
                suspect_pages = [p for p in all_pages if p.get("embed_provenance") != "api"]
            except Exception as e:
                print(f"[BACKFILL] Error reading local DB: {e}")
    else:
        print("[BACKFILL] Loading pages from MongoDB Atlas database...")
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri())
            db = client["fahem"]
            all_pages_count = db["book_pages"].count_documents({})
            suspect_pages = list(db["book_pages"].find({"embed_provenance": {"$ne": "api"}}))
            client.close()
        except Exception as e:
            print(f"[BACKFILL] Error connecting to MongoDB: {e}")
            
    return suspect_pages, all_pages_count

def write_back_all_local_pages(modified_pages):
    """
    Writes all modified pages back to the local database file in a single atomic transaction.
    """
    if os.path.exists(LOCAL_DB_PATH):
        try:
            with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                db = json.load(f)
            
            pages = db.get("book_pages", [])
            
            # Index current pages by composite (book_id, page_number)
            page_map = {}
            for p in pages:
                key = (p.get("book_id"), p.get("page_number"))
                page_map[key] = p
                
            # Override with modified pages
            for mp in modified_pages:
                key = (mp.get("book_id"), mp.get("page_number"))
                page_map[key] = mp
                
            db["book_pages"] = list(page_map.values())
            atomic_write_json(LOCAL_DB_PATH, db)
            print(f"[BACKFILL] Successfully saved all {len(modified_pages)} modified pages to local DB.")
        except Exception as e:
            print(f"[BACKFILL] Failed to write back pages to local DB: {e}", file=sys.stderr)

def write_back_all_mongo_pages(modified_pages):
    """
    Writes all modified pages back to MongoDB using bulk operations.
    """
    try:
        from pymongo import MongoClient, ReplaceOne
        client = MongoClient(get_mongodb_uri())
        db = client["fahem"]
        
        operations = []
        for p in modified_pages:
            operations.append(ReplaceOne({"_id": p["_id"]}, p))
            
        if operations:
            result = db["book_pages"].bulk_write(operations)
            print(f"[BACKFILL] MongoDB bulk update complete. Matched: {result.matched_count}, Modified: {result.modified_count}")
        client.close()
    except Exception as e:
        print(f"[BACKFILL] MongoDB bulk update failed: {e}", file=sys.stderr)

def main():
    print("=" * 60)
    print("FAHEM HIGH-PERFORMANCE EMBEDDING MODEL BACKFILL AND RE-EMBED UTILITY")
    print("=" * 60)
    
    # 1. Startup validation
    api_key, _ = get_gemini_config()
    print(f"[BACKFILL] Embedding Model: {EMBED_MODEL}")
    print(f"[BACKFILL] Dimension Limit: {EMBED_DIM}")
    print(f"[BACKFILL] Initiating Startup Verification Probe...")
    
    try:
        probe_vector = get_gemini_embedding_v2("Fahem embedding startup validation probe.", api_key)
        if not probe_vector:
            raise ValueError("Probe returned empty embedding vector.")
        if len(probe_vector) != EMBED_DIM:
            raise ValueError(f"Embedding dimension mismatch: expected {EMBED_DIM}, got {len(probe_vector)}")
        print("[BACKFILL] ✅ Startup verification probe passed successfully.")
    except Exception as probe_err:
        print(f"[BACKFILL] [CRITICAL] Startup verification probe failed: {probe_err}", file=sys.stderr)
        print("[BACKFILL] Aborting backfill to prevent any silent failures or corruptions.", file=sys.stderr)
        sys.exit(1)
        
    is_local = not is_mongodb_enabled()
    suspect_pages, all_pages_count = load_all_suspect_pages(is_local)
    
    total_suspect = len(suspect_pages)
    print(f"[BACKFILL] Total pages in DB: {all_pages_count}")
    print(f"[BACKFILL] Suspect pages (lacking embed_provenance='api'): {total_suspect}")
    
    if total_suspect == 0:
        print("[BACKFILL] 🎉 No suspect pages found. Database embeddings are 100% aligned and provenanced.")
        sys.exit(0)
        
    print(f"[BACKFILL] Starting backfill process for {total_suspect} pages using 3 concurrent threads...")
    
    success_count = 0
    failure_count = 0
    processed_count = 0
    state_lock = threading.Lock()
    modified_pages = []
    
    def process_single_suspect_page(p_doc):
        nonlocal success_count, failure_count, processed_count
        
        page_num = p_doc.get("page_number", "?")
        book_id = p_doc.get("book_id", "?")
        
        final_text = construct_page_text(p_doc)
        
        try:
            vector = get_gemini_embedding_v2(final_text, api_key)
            if not vector or len(vector) != EMBED_DIM:
                raise ValueError(f"Invalid or mismatching dimension from API: {len(vector) if vector else 0}")
            
            p_doc["embedding"] = vector
            p_doc["status"] = "embedded"
            p_doc["embed_model"] = EMBED_MODEL
            p_doc["embed_dim"] = EMBED_DIM
            p_doc["embed_provenance"] = "api"
            
            with state_lock:
                success_count += 1
                modified_pages.append(p_doc)
        except Exception as err:
            print(f"[BACKFILL ERROR] Book {book_id} Page {page_num} failed: {err}")
            p_doc["embedding"] = []
            p_doc["status"] = "embed_failed"
            p_doc["embed_model"] = EMBED_MODEL
            p_doc["embed_dim"] = EMBED_DIM
            p_doc["embed_provenance"] = "failed"
            
            with state_lock:
                failure_count += 1
                modified_pages.append(p_doc)
        
        with state_lock:
            processed_count += 1
            if processed_count % 5 == 0 or processed_count == total_suspect:
                pct = (processed_count / total_suspect) * 100.0
                print(f"[BACKFILL PROGRESS] {processed_count}/{total_suspect} ({pct:.1f}%) processed. Success: {success_count}, Failed: {failure_count}")

    # Process pages using a ThreadPoolExecutor with 3 workers to respect rate limits
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {pool.submit(process_single_suspect_page, p_doc): p_doc for p_doc in suspect_pages}
        for fut in as_completed(futures):
            try:
                fut.result()
            except Exception as e:
                print(f"[BACKFILL EXCEPTION] Thread execution crashed: {e}", file=sys.stderr)
                
    # Single batch write back to disk or Mongo at the end
    print(f"[BACKFILL] Processing complete. Saving {len(modified_pages)} pages back to database...")
    if is_local:
        write_back_all_local_pages(modified_pages)
    else:
        write_back_all_mongo_pages(modified_pages)
        
    print("=" * 60)
    print("FAHEM BACKFILL PROCESSING COMPLETE")
    print(f"Total processed: {processed_count}")
    print(f"Successfully re-embedded: {success_count}")
    print(f"Failed embedding: {failure_count}")
    print("=" * 60)

if __name__ == "__main__":
    main()
