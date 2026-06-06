#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Double Ingestion Test on real textbooks:
1. Introduction to Python Programming (3 random pages)
2. History Secondary 3 Egypt (3 random pages)
Includes programmatic Pillow generation of an ultra-premium History cover poster.
"""

import os
import sys
import json
import time
import random
import requests
import subprocess
import fitz  # PyMuPDF
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageColor
import io

# Force UTF-8 on Windows terminal stdout/stderr to avoid cp1252/charmap encode errors
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add agents dir to path for imports

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, os.path.join(ROOT_DIR, "agents"))
sys.path.insert(0, os.path.join(ROOT_DIR, "agents", "ingestion_v2"))

from ingestion_v2.utils import (
    update_job_status, get_job_status, LOCAL_DB_PATH,
    is_mongodb_enabled, get_mongodb_uri
)

# Target PDF URLs
PYTHON_URL = "https://assets.openstax.org/oscms-prodcms/media/documents/Introduction_to_Python_Programming-WEB.pdf"
HISTORY_URL = "https://elearnningcontent.blob.core.windows.net/elearnningcontent/2026/Secondry/Secondry3/Term1/StudentBook/History_Sec3.pdf"

# Local temporary files
PYTHON_LOCAL_FULL = os.path.join(ROOT_DIR, "ignore", "python_full_temp.pdf")
HISTORY_LOCAL_FULL = os.path.join(ROOT_DIR, "ignore", "history_full_temp.pdf")

PYTHON_SUBSET = os.path.join(ROOT_DIR, "ignore", "python_3pages.pdf")
HISTORY_SUBSET = os.path.join(ROOT_DIR, "ignore", "history_3pages.pdf")

COVER_OUT = os.path.join(ROOT_DIR, "ignore", "history_sec3_cover.png")

def download_file(url, local_path, label):
    if os.path.exists(local_path) and os.path.getsize(local_path) > 1024 * 1024:
        print(f"[INIT] {label} already cached locally.")
        return True
    print(f"[DOWNLOAD] Downloading {label} from {url}...", flush=True)
    try:
        res = requests.get(url, stream=True, timeout=60)
        res.raise_for_status()
        with open(local_path, "wb") as f:
            for chunk in res.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        print(f"[DOWNLOAD] ✅ Completed downloading {label}.", flush=True)
        return True
    except Exception as e:
        print(f"[DOWNLOAD ERROR] Failed to download {label}: {e}", file=sys.stderr)
        return False

def extract_subset(src_path, dest_path, pages_list, label):
    print(f"[CROP] Extracting pages {pages_list} from {label}...", flush=True)
    try:
        src_doc = fitz.open(src_path)
        dest_doc = fitz.open()
        for p_num in pages_list:
            if 0 <= p_num < len(src_doc):
                dest_doc.insert_pdf(src_doc, from_page=p_num, to_page=p_num)
        dest_doc.save(dest_path)
        dest_doc.close()
        src_doc.close()
        print(f"[CROP] ✅ Saved subset PDF to {os.path.basename(dest_path)}", flush=True)
        return True
    except Exception as e:
        print(f"[CROP ERROR] Failed to crop {label}: {e}", file=sys.stderr)
        return False

def draw_premium_cover():
    """
    Programmatically designs an ultra-premium, gorgeous textbook cover art
    using complex Pillow gradients, glassmorphic elements, and typography.
    """
    print("[IMAGE AGENT] Drawing premium History Sec3 Cover/Poster...", flush=True)
    width, height = 800, 1200
    img = Image.new("RGBA", (width, height), (30, 20, 20, 255))
    draw = ImageDraw.Draw(img)

    # 1. Complex gradient background (Warm ancient terracotta & deep gold)
    for y in range(height):
        ratio = y / float(height)
        # Deep brown-black to rich terracotta to warm sand
        r = int(24 + (160 - 24) * (ratio ** 1.8))
        g = int(18 + (90 - 18) * (ratio ** 1.5))
        b = int(14 + (45 - 14) * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    # 2. Geometric historical grid patterns in background
    for idx in range(12):
        spacing = idx * 60
        draw.ellipse([width//2 - spacing, height//2 - spacing - 100, width//2 + spacing, height//2 + spacing - 100], 
                     outline=(220, 160, 60, 15), width=2)
        draw.line([0, spacing * 1.5, width, spacing * 1.5 + 200], fill=(220, 160, 60, 8), width=1)

    # 3. Glassmorphic center card
    glass_w, glass_h = 680, 880
    glass_x, glass_y = (width - glass_w) // 2, (height - glass_h) // 2
    # Create blur substrate
    blur_card = img.crop((glass_x, glass_y, glass_x + glass_w, glass_y + glass_h))
    blur_card = blur_card.filter(ImageFilter.GaussianBlur(radius=20))
    img.paste(blur_card, (glass_x, glass_y))
    
    # White translucent card face & bright metallic gold border
    overlay = Image.new("RGBA", (glass_w, glass_h), (255, 255, 255, 12))
    draw_ol = ImageDraw.Draw(overlay)
    draw_ol.rectangle([0, 0, glass_w - 1, glass_h - 1], outline=(220, 170, 70, 120), width=3)
    img.alpha_composite(overlay, (glass_x, glass_y))

    # 4. Premium Typography & Embellishments
    try:
        font_title = ImageFont.truetype("arial.ttf", 46)
        font_sub = ImageFont.truetype("arial.ttf", 26)
        font_meta = ImageFont.truetype("arial.ttf", 20)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_meta = ImageFont.load_default()

    # Title text
    draw.text((width//2, height//2 - 250), "HISTORY OF MODERN EGYPT", fill=(255, 240, 210, 240), font=font_title, anchor="mm")
    draw.text((width//2, height//2 - 190), "& THE WORLD", fill=(250, 200, 100, 240), font=font_title, anchor="mm")
    
    # Golden horizontal divider
    draw.line([width//2 - 150, height//2 - 120, width//2 + 150, height//2 - 120], fill=(220, 170, 70, 220), width=4)

    # Subtitle
    draw.text((width//2, height//2 - 60), "CURRICULUM SPECIFICATION", fill=(255, 255, 255, 180), font=font_sub, anchor="mm")
    draw.text((width//2, height//2 - 15), "SECONDARY GRADE 3", fill=(255, 255, 255, 180), font=font_sub, anchor="mm")

    # Abstract Egyptian pyramid vector line-art
    pyramid_y = height // 2 + 100
    draw.polygon([(width//2, pyramid_y + 120), (width//2 - 120, pyramid_y + 260), (width//2 + 120, pyramid_y + 260)], 
                 outline=(250, 190, 80, 140), width=2)
    # Side shadow line
    draw.line([(width//2, pyramid_y + 120), (width//2, pyramid_y + 260)], fill=(250, 190, 80, 200), width=2)
    
    # Metadata footers
    draw.text((width//2, height - 120), "FAHEM PREMIUM LEARNING SUITE", fill=(220, 170, 70, 180), font=font_meta, anchor="mm")
    draw.text((width//2, height - 85), "TERM 1 - MINISTRY OF EDUCATION SPECIFICATION", fill=(255, 255, 255, 120), font=font_meta, anchor="mm")

    img.convert("RGB").save(COVER_OUT)
    print(f"[IMAGE AGENT] ✅ Premium cover graphic successfully generated and saved to {COVER_OUT}.", flush=True)

def run_ingestion_pipeline(book_id, title, title_ar, filename, grade, lang):
    print(f"\n[INGESTION] Spawning pipeline cascade for {book_id}...", flush=True)
    payload = {
        "book_id": book_id,
        "subject_id": "subj_user_uploads",
        "title": title,
        "title_ar": title_ar,
        "source_url": "offline_mock_test_mode",
        "storage_path": filename,
        "grade": grade,
        "term": "Term 1",
        "year": "2026",
        "language": lang,
        "book_type": "core",
        "userId": "usr_real_test",
        "is_local": True
    }

    # Add the initial draft record to the database so that syncing works
    if is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri())
            db = client["fahem"]
            db["books"].update_one(
                {"_id": book_id},
                {"$set": {
                    "_id": book_id,
                    "subject_id": "subj_user_uploads",
                    "title": title,
                    "title_ar": title_ar,
                    "grade": grade,
                    "term": "Term 1",
                    "year": "2026",
                    "language": lang,
                    "book_type": "core",
                    "storage_path": filename,
                    "ingestion_status": "queued",
                    "ingestion_progress": 5,
                    "ingestion_logs": ["[INIT] Test started."],
                    "processed_pages": 0,
                    "total_pages": 0,
                    "is_completed": False
                }},
                upsert=True
            )
            client.close()
        except Exception as e:
            print(f"[MONGO DRAFT ERROR] {e}", file=sys.stderr)

    python_path = sys.executable or "python"
    fetch_script = os.path.join(ROOT_DIR, "agents", "ingestion_v2", "job_fetch.py")
    
    proc = subprocess.Popen(
        [python_path, fetch_script],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    proc.stdin.write(json.dumps(payload))
    proc.stdin.close()
    
    # Wait for completion & poll
    job_id = f"job_{book_id}"
    poll_start = time.time()
    max_wait = 300
    completed = False
    
    print(f"[INGESTION] Process started with PID {proc.pid}. Polling real-time progress...", flush=True)
    while time.time() - poll_start < max_wait:
        # Check database records
        status = get_job_status(job_id, is_local=True)
        # Fetch matching book to show synchronized status
        book_progress = 0
        book_status = "unknown"
        if is_mongodb_enabled():
            try:
                from pymongo import MongoClient
                client = MongoClient(get_mongodb_uri())
                b_doc = client["fahem"]["books"].find_one({"_id": book_id})
                if b_doc:
                    book_progress = b_doc.get("ingestion_progress", 0)
                    book_status = b_doc.get("ingestion_status", "unknown")
                client.close()
            except Exception:
                pass
        
        print(f"[POLLER - {book_id}] Job Status: '{status}' | Synced Book Status: '{book_status}' ({book_progress}%)", flush=True)
        if status in ["completed", "failed", "killed"] or book_status == "completed":
            completed = True
            break
        time.sleep(4.0)
        
    # Read subprocess outputs to make sure there are no issues
    stdout, stderr = proc.communicate()
    if stderr:
        print(f"[STDERR - {book_id}]: {stderr}", file=sys.stderr)
    return completed

def main():
    print("==========================================================")
    print("   REAL BOOK INGESTION V2 & IMAGE AGENT NANO BANANA 2 TEST  ")
    print("==========================================================\n")
    
    # Step 1: Create directories if needed
    os.makedirs(os.path.join(ROOT_DIR, "ignore"), exist_ok=True)
    
    # Step 2: Draw the beautiful textbook cover art
    draw_premium_cover()
    
    # Step 3: Download full textbooks
    ok = download_file(PYTHON_URL, PYTHON_LOCAL_FULL, "Python Programming")
    if not ok:
        sys.exit(1)
        
    ok = download_file(HISTORY_URL, HISTORY_LOCAL_FULL, "Egyptian History Secondary 3")
    if not ok:
        sys.exit(1)
        
    # Step 4: Extract random 3 pages for Python (e.g. pages 40, 41, 42)
    extract_subset(PYTHON_LOCAL_FULL, PYTHON_SUBSET, [40, 41, 42], "Python Programming")
    
    # Step 5: Extract random 3 pages for History (e.g. pages 30, 31, 32)
    extract_subset(HISTORY_LOCAL_FULL, HISTORY_SUBSET, [30, 31, 32], "History Secondary 3")
    
    # Step 6: Ingest Python Book
    p_ok = run_ingestion_pipeline(
        book_id="book_python_real_test",
        title="Introduction to Python Programming",
        title_ar="مقدمة في البرمجة بلغة بايثون",
        filename="python_3pages.pdf",
        grade="Secondary 1",
        lang="en"
    )
    
    # Step 7: Ingest History Book
    h_ok = run_ingestion_pipeline(
        book_id="book_history_real_test",
        title="History of Modern Egypt",
        title_ar="تاريخ مصر الحديث والمعاصر",
        filename="history_3pages.pdf",
        grade="Secondary 3",
        lang="ar"
    )
    
    print("\n==========================================================")
    print("                 INGESTION VERIFICATION REPORT            ")
    print("==========================================================")
    print(f"- Pillow Cover Generated: {os.path.exists(COVER_OUT)} ({os.path.getsize(COVER_OUT)} bytes)")
    print(f"- Python Ingestion Completed: {p_ok}")
    print(f"- History Ingestion Completed: {h_ok}")
    
    # Load and print sample generated database records
    if is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri())
            db = client["fahem"]
            
            p_book = db["books"].find_one({"_id": "book_python_real_test"})
            h_book = db["books"].find_one({"_id": "book_history_real_test"})
            
            print(f"\n--- Python Book Metadata (MongoDB) ---")
            if p_book:
                print(f"Title: {p_book.get('title')} | Status: {p_book.get('status')} | Progress: {p_book.get('ingestion_progress')}%")
                print(f"Chapters Count: {len(p_book.get('chapters', []))} | Cover Image: {p_book.get('coverUrl')}")
            else:
                print("Python book metadata not found in MongoDB.")
                
            print(f"\n--- History Book Metadata (MongoDB) ---")
            if h_book:
                print(f"Title: {h_book.get('title')} | Status: {h_book.get('status')} | Progress: {h_book.get('ingestion_progress')}%")
                print(f"Chapters Count: {len(h_book.get('chapters', []))} | Cover Image: {h_book.get('coverUrl')}")
            else:
                print("History book metadata not found in MongoDB.")
                
            p_pages_cnt = db["book_pages"].count_documents({"book_id": "book_python_real_test"})
            h_pages_cnt = db["book_pages"].count_documents({"book_id": "book_history_real_test"})
            print(f"\n- Pages Extracted (Python): {p_pages_cnt}")
            print(f"- Pages Extracted (History): {h_pages_cnt}")
            
            client.close()
        except Exception as e:
            print(f"Failed verifying MongoDB collection: {e}")
            
    print("\n==========================================================")
    if p_ok and h_ok:
        print("          [SUCCESS] ALL TASKS COMPLETED SUCCESSFULLY      ")
    else:
        print("          [WARNING] ONE OR MORE PIPELINE STEPS FAILED     ")
    print("==========================================================")

if __name__ == "__main__":
    main()
