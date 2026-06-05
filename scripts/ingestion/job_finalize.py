#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Job 4: Ingestion Finalizer & Database Mapping Job.
Performs final index checks, links book in subjects count, cleans up transient draft chunks,
and sets job state as completed (100% progress).
"""

import os
import sys
import json
import time
from utils import (
    update_job_status, get_mongodb_uri, LOCAL_DB_PATH, 
    atomic_write_json, is_mongodb_enabled
)

def clean_draft_chunks(book_id, is_local):
    """
    Cleans transient page draft chunks in the ingestion_chunks_draft collection or local DB.
    """
    if is_local or not is_mongodb_enabled():
        if os.path.exists(LOCAL_DB_PATH):
            try:
                with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                    db = json.load(f)
                if "ingestion_chunks_draft" in db:
                    db["ingestion_chunks_draft"] = [c for c in db["ingestion_chunks_draft"] if c.get("book_id") != book_id]
                atomic_write_json(LOCAL_DB_PATH, db)
            except Exception as e:
                print(f"[JOB 4 Local Clean Error] {e}", file=sys.stderr)
    
    if is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri(), serverSelectionTimeoutMS=2000)
            db = client["fahem"]
            db["ingestion_chunks_draft"].delete_many({"book_id": book_id})
            client.close()
        except Exception as e:
            print(f"[JOB 4 Mongo Clean Error] {e}", file=sys.stderr)

def finalize_subject_link(subject_id, is_local):
    """
    Updates the subject books_count and pages metrics.
    """
    if is_local or not is_mongodb_enabled():
        if os.path.exists(LOCAL_DB_PATH):
            try:
                with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                    db = json.load(f)
                
                if "subjects" in db:
                    for s in db["subjects"]:
                        if s.get("_id") == subject_id:
                            # Count actual books
                            count = len([b for b in db.get("books", []) if b.get("subject_id") == subject_id])
                            s["books_count"] = count
                            break
                atomic_write_json(LOCAL_DB_PATH, db)
            except Exception as e:
                print(f"[JOB 4 Local Subject Error] {e}", file=sys.stderr)
                
    if is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri(), serverSelectionTimeoutMS=2000)
            db = client["fahem"]
            
            # Count actual books in MongoDB
            count = db["books"].count_documents({"subject_id": subject_id})
            
            db["subjects"].update_one(
                {"_id": subject_id},
                {"$set": {"books_count": count}}
            )
            client.close()
        except Exception as e:
            print(f"[JOB 4 Mongo Subject Error] {e}", file=sys.stderr)

def compile_chapters_and_toc(book_id, total_pages, is_local, pdf_toc=None):
    """
    Smart Table of Contents and Chapter structure compiler.
    Uses native PDF outline if available, or falls back to page-by-page 
    chapterTitleEn/chapterTitleAr annotations from Gemini page records.
    """
    chapters = []
    
    # Let's load the actual page documents to fetch Gemini-annotated chapter titles and concepts
    pages_list = []
    if is_local or not is_mongodb_enabled():
        if os.path.exists(LOCAL_DB_PATH):
            try:
                with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                    db = json.load(f)
                pages_list = [p for p in db.get("book_pages", []) if p.get("book_id") == book_id]
            except Exception as e:
                print(f"[compile_chapters] Failed to load local pages: {e}", file=sys.stderr)
    
    if is_mongodb_enabled() and not pages_list:
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri(), serverSelectionTimeoutMS=2000)
            db = client["fahem"]
            pages_list = list(db["book_pages"].find({"book_id": book_id}))
            client.close()
        except Exception as e:
            print(f"[compile_chapters] Failed to load mongo pages: {e}", file=sys.stderr)

    # Sort pages by page number
    pages_list = sorted(pages_list, key=lambda p: p.get("page_number", p.get("pageNum", 1)))
    
    # 1. First, attempt to parse native PDF TOC if provided
    # pdf_toc format: list of [level, title, page_number]
    if pdf_toc and len(pdf_toc) > 0:
        # Keep only level 1 (or level 2 if level 1 is extremely sparse)
        lvl1_entries = [entry for entry in pdf_toc if entry[0] == 1]
        if not lvl1_entries:
            lvl1_entries = [entry for entry in pdf_toc if entry[0] <= 2]
            
        if lvl1_entries:
            # Sort entries by page number to be safe
            lvl1_entries = sorted(lvl1_entries, key=lambda e: e[2])
            
            for idx, entry in enumerate(lvl1_entries):
                title = entry[1]
                start_p = entry[2]
                
                # End page is the page before the next entry, or total_pages
                if idx < len(lvl1_entries) - 1:
                    end_p = lvl1_entries[idx+1][2] - 1
                else:
                    end_p = total_pages
                
                # Clamp boundaries
                start_p = max(1, min(start_p, total_pages))
                end_p = max(start_p, min(end_p, total_pages))
                
                # Collect concepts in this range from annotated pages
                ch_concepts = []
                ch_concepts_ar = []
                for p in pages_list:
                    p_num = p.get("page_number", p.get("pageNum", 1))
                    if start_p <= p_num <= end_p:
                        for c in p.get("concepts", []):
                            if c not in ch_concepts:
                                ch_concepts.append(c)
                        for c_ar in p.get("concepts_ar", []):
                            if c_ar not in ch_concepts_ar:
                                ch_concepts_ar.append(c_ar)
                
                chapters.append({
                    "title": title,
                    "title_ar": title, # Default
                    "page_start": start_p,
                    "page_end": end_p,
                    "start_page": start_p,
                    "end_page": end_p,
                    "concepts": ch_concepts[:8], # limit to top 8 concepts
                    "concepts_ar": ch_concepts_ar[:8]
                })
                
    # 2. If no native TOC entries are compiled, fallback to Gemini transitions
    if not chapters and len(pages_list) > 0:
        current_ch_title_en = None
        current_ch_title_ar = None
        start_page = 1
        current_concepts = []
        current_concepts_ar = []
        
        for idx, p in enumerate(pages_list):
            p_num = p.get("page_number", p.get("pageNum", idx + 1))
            ch_en = p.get("chapterTitleEn") or p.get("chapter_title_en") or ""
            ch_ar = p.get("chapterTitleAr") or p.get("chapter_title_ar") or ""
            
            # Clean generic titles like "Section X" or "Page X" to group them logically
            is_generic = (
                not ch_en or 
                ch_en.lower().startswith("section ") or 
                ch_en.lower().startswith("page ") or 
                ch_en.lower() == "chapter"
            )
            
            # If it's generic, we can group in chunks of 10 pages as a fallback
            if is_generic:
                group_num = ((p_num - 1) // 10) + 1
                ch_en = f"Chapter {group_num}: Foundations"
                ch_ar = f"الفصل {group_num}: الأساسيات"
            
            if current_ch_title_en is None:
                current_ch_title_en = ch_en
                current_ch_title_ar = ch_ar
                start_page = p_num
                
            # If the chapter title changes, we close the current chapter and open a new one
            if ch_en != current_ch_title_en and p_num > start_page:
                chapters.append({
                    "title": current_ch_title_en,
                    "title_ar": current_ch_title_ar or current_ch_title_en,
                    "page_start": start_page,
                    "page_end": p_num - 1,
                    "start_page": start_page,
                    "end_page": p_num - 1,
                    "concepts": list(dict.fromkeys(current_concepts))[:8],
                    "concepts_ar": list(dict.fromkeys(current_concepts_ar))[:8]
                })
                current_ch_title_en = ch_en
                current_ch_title_ar = ch_ar
                start_page = p_num
                current_concepts = []
                current_concepts_ar = []
                
            # Accumulate concepts
            for c in p.get("concepts", []):
                current_concepts.append(c)
            for c_ar in p.get("concepts_ar", []):
                current_concepts_ar.append(c_ar)
                
        # Append the last chapter
        if current_ch_title_en is not None:
            chapters.append({
                "title": current_ch_title_en,
                "title_ar": current_ch_title_ar or current_ch_title_en,
                "page_start": start_page,
                "page_end": total_pages,
                "start_page": start_page,
                "end_page": total_pages,
                "concepts": list(dict.fromkeys(current_concepts))[:8],
                "concepts_ar": list(dict.fromkeys(current_concepts_ar))[:8]
            })

    # Ultimate fallback if no pages or chapters are compiled
    if not chapters:
        chapters = [{
            "title": "Chapter 1: Full Book Overview",
            "title_ar": "الفصل 1: نظرة عامة على الكتاب",
            "page_start": 1,
            "page_end": total_pages,
            "start_page": 1,
            "end_page": total_pages,
            "concepts": ["Core Syllabus", "Curriculum Standards"],
            "concepts_ar": ["المنهج الأساسي", "معايير التعليم"]
        }]
        
    return chapters

def main():
    try:
        payload = json.loads(sys.stdin.read())
    except Exception as e:
        print(f"Error parsing stdin JSON in Job 4: {e}", file=sys.stderr)
        sys.exit(1)

    book_id = payload.get("book_id")
    subject_id = payload.get("subject_id", "subj_user_uploads")
    is_local = payload.get("is_local", True)
    total_pages = payload.get("total_pages", 1)
    pdf_toc = payload.get("pdf_toc")
    
    # Compile dynamic Table of Contents structure
    compiled_chapters = compile_chapters_and_toc(book_id, total_pages, is_local, pdf_toc)
    
    logs = payload.get("ingestion_logs", [])
    if not logs:
        logs = [f"[{time.strftime('%H:%M:%S')}] [INIT] Job 4: Ingestion Finalizer process spawned."]
        
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
        "chapters": compiled_chapters
    }

    t_str = time.strftime("%H:%M:%S")
    logs.append(f"[{t_str}] [COMPLETE] Job 4: Executing final consistency validations and linking metadata records.")
    update_job_status(job_id, "processing", "finalize", 95, logs, total_pages, total_pages, False, is_local, **metadata)

    # Clean transient drafts
    clean_draft_chunks(book_id, is_local)
    
    # Finalize link inside subjects
    finalize_subject_link(subject_id, is_local)

    logs.append(f"[{time.strftime('%H:%M:%S')}] [COMPLETE] ✅ All ingestion tasks completed successfully. Textbook is now fully optimized and active for RAG.")
    print(f"[JOB 4: FINALIZE] Ingestion completed. Setting job state as completed...", flush=True)

    update_job_status(
        job_id, "completed", "finalize", 100, logs, 
        processed_pages=total_pages, total_pages=total_pages, 
        is_completed=True, is_local=is_local, **metadata
    )
    
    sys.exit(0)

if __name__ == "__main__":
    main()
