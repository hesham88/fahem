#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Job 5: Embed Job for Ingestion Pipeline v2.
Runs last on translated page structures. For each page, chunks on block boundaries,
prepends the heading-path hierarchy context, calls gemini-embedding-2 (3072 dimensions)
to generate high-fidelity vector embeddings, cleans transient temporary draft chunks, and
finalizes subject metric links, setting job status as 100% completed.
"""

import os
import sys
import json
import time
import threading

from utils import (
    update_job_status, check_cooperative_control, ROOT_DIR,
    get_gemini_config, get_gemini_embedding_v2,
    is_mongodb_enabled, get_mongodb_uri, LOCAL_DB_PATH, atomic_write_json
)

db_write_lock = threading.Lock()

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

def load_translated_pages(book_id, is_local):
    pages = []
    if is_local or not is_mongodb_enabled():
        if os.path.exists(LOCAL_DB_PATH):
            try:
                with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                    db = json.load(f)
                pages = [p for p in db.get("book_pages", []) if p.get("book_id") == book_id]
            except Exception:
                pass
    if is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri())
            db = client["fahem"]
            pages = list(db["book_pages"].find({"book_id": book_id}))
            client.close()
        except Exception:
            pass
    return sorted(pages, key=lambda p: p.get("page_number", 1))

def clean_draft_chunks(book_id, is_local):
    """
    Cleans transient chunks if any exist.
    """
    if is_local or not is_mongodb_enabled():
        if os.path.exists(LOCAL_DB_PATH):
            try:
                with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                    db = json.load(f)
                if "ingestion_chunks_draft" in db:
                    db["ingestion_chunks_draft"] = [c for c in db["ingestion_chunks_draft"] if c.get("book_id") != book_id]
                atomic_write_json(LOCAL_DB_PATH, db)
            except Exception:
                pass
    if is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri())
            db = client["fahem"]
            db["ingestion_chunks_draft"].delete_many({"book_id": book_id})
            client.close()
        except Exception:
            pass

def finalize_subject_link(subject_id, is_local):
    """
    Recalculates subject count metrics.
    """
    if is_local or not is_mongodb_enabled():
        if os.path.exists(LOCAL_DB_PATH):
            try:
                with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                    db = json.load(f)
                if "subjects" in db:
                    for s in db["subjects"]:
                        if s.get("_id") == subject_id:
                            count = len([b for b in db.get("books", []) if b.get("subject_id") == subject_id])
                            s["books_count"] = count
                            break
                atomic_write_json(LOCAL_DB_PATH, db)
            except Exception:
                pass
    if is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri())
            db = client["fahem"]
            count = db["books"].count_documents({"subject_id": subject_id})
            db["subjects"].update_one(
                {"_id": subject_id},
                {"$set": {"books_count": count}}
            )
            client.close()
        except Exception:
            pass

def main():
    try:
        payload = json.loads(sys.stdin.read())
    except Exception as e:
        print(f"Error parsing stdin JSON in Job 5: {e}", file=sys.stderr)
        sys.exit(1)

    book_id = payload.get("book_id")
    subject_id = payload.get("subject_id", "subj_user_uploads")
    is_local = payload.get("is_local", True)
    total_pages = payload.get("total_pages", 1)
    logs = payload.get("ingestion_logs", [])
    
    job_id = f"job_{book_id}"
    
    metadata = {
        "book_id": book_id,
        "subject_id": subject_id,
        "title": payload.get("title"),
        "title_ar": payload.get("title_ar"),
        "source_url": payload.get("source_url"),
        "storage_path": payload.get("storage_path"),
        "grade": payload.get("grade"),
        "term": payload.get("term"),
        "year": payload.get("year"),
        "language": payload.get("language"),
        "book_type": payload.get("book_type"),
        "userId": payload.get("userId"),
        "chapters": payload.get("chapters", []),
        "coverUrl": payload.get("coverUrl"),
        "coverThumbUrl": payload.get("coverThumbUrl"),
        "mindMap": payload.get("mindMap", {"nodes": [], "links": []})
    }

    t_str = time.strftime("%H:%M:%S")
    logs.append(f"[{t_str}] [EMBED] Job 5: Structuring block chunks and calling gemini-embedding-2 model.")
    update_job_status(job_id, "processing", "embed", 86, logs, 0, total_pages, False, is_local, **metadata)

    translated_pages = load_translated_pages(book_id, is_local)
    actual_pages_count = len(translated_pages) if translated_pages else 1

    api_key, _ = get_gemini_config()
    if api_key:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [EMBED] Loaded Gemini API credentials. Triggering 3072-dimensional vector search mappings.")
    else:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [WARNING] API credentials omitted. Utilizing 3072-dimensional deterministic offline hashing.")

    embedded_count = 0

    for idx, p_doc in enumerate(translated_pages):
        check_cooperative_control(job_id, is_local, logs)
        
        blocks = p_doc.get("blocks", [])
        
        # 1. Chunk on boundary blocks
        # Extract meaningful texts from blocks and concatenate
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
        
        # 2. Prepend hierarchical heading context path
        heading_path = get_heading_path(blocks)
        final_embedding_text = f"{heading_path}{raw_joined_text}" if raw_joined_text else f"Page {p_doc.get('page_number')}"
        
        # 3. Call gemini-embedding-2 to get 3072-dim vector representation
        vector = get_gemini_embedding_v2(final_embedding_text, api_key)
        
        # 4. Extract page concepts and formulas from structured blocks
        concepts_found = []
        formulas_found = []
        for b in blocks:
            b_type = b.get("type")
            if b_type == "equation":
                f_latex = b.get("latex")
                if f_latex:
                    formulas_found.append(f_latex.strip())
                elif b.get("text"):
                    formulas_found.append(b["text"].strip())
            elif b_type == "definition" and b.get("term"):
                concepts_found.append(b["term"].strip())
            elif b_type == "heading" and b.get("text"):
                h_text = b["text"].strip()
                if "page" not in h_text.lower() and "overview" not in h_text.lower():
                    concepts_found.append(h_text)
            elif b_type in ["callout", "example"] and b.get("title"):
                concepts_found.append(b["title"].strip())

        p_doc["concepts"] = list(dict.fromkeys(concepts_found))[:5]
        p_doc["formulas"] = list(dict.fromkeys(formulas_found))[:5]
        p_doc["embedding"] = vector
        p_doc["status"] = "embedded"
        
        embedded_count += 1
        pct = 86 + int((embedded_count / actual_pages_count) * 12)  # Range 86% - 98%
        
        # Update database with embedded page doc
        with db_write_lock:
            update_job_status(
                job_id, "processing", "embed", pct, logs,
                processed_pages=embedded_count, total_pages=actual_pages_count,
                is_completed=False, is_local=is_local, new_page_doc=p_doc, **metadata
            )

    # Clean temporary drafts
    clean_draft_chunks(book_id, is_local)
    
    # Recalculate metrics
    finalize_subject_link(metadata["subject_id"], is_local)

    logs.append(f"[{time.strftime('%H:%M:%S')}] [COMPLETE] ✅ All Ingestion v2 stages successfully finished. Textbook blocks and 3072-d vectors are active.")
    print(f"[JOB 5: EMBED] Embedded all pages. Finalizing job state...", flush=True)

    update_job_status(
        job_id, "completed", "finalize", 100, logs,
        processed_pages=actual_pages_count, total_pages=actual_pages_count,
        is_completed=True, is_local=is_local, **metadata
    )
    
    sys.exit(0)

if __name__ == "__main__":
    main()
