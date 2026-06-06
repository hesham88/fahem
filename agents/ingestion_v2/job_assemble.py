#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Job 4: Assemble Job for Ingestion Pipeline v2.
Compiles standard Table of Contents, constructs interactive hierarchically linked Mind Maps,
generates professional-grade glassmorphic textbook cover graphics using Pillow, and triggers
Stage 5 (Embed).
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import time
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageColor

from utils import (
    update_job_status, check_cooperative_control, ROOT_DIR,
    JSON_Encoder, is_mongodb_enabled, get_mongodb_uri, LOCAL_DB_PATH
)

def compile_chapters_and_toc(book_id, total_pages, is_local, pdf_toc=None):
    """
    Table of Contents compiler. Reuses native outline bookmarks if captured,
    or falls back to heading blocks from translated pages in the database.
    """
    chapters = []
    
    # 1. Use native TOC bookmarks if present
    if pdf_toc and len(pdf_toc) > 0:
        print(f"[Assemble] Compiling {len(pdf_toc)} native bookmarks...", flush=True)
        for idx, entry in enumerate(pdf_toc):
            level, title, page = entry[:3]
            if level <= 2:  # chapter titles or major sections
                # Find start page
                start_p = max(1, min(page, total_pages))
                # Find end page (start of next chapter minus 1)
                end_p = total_pages
                if idx + 1 < len(pdf_toc):
                    next_p = pdf_toc[idx+1][2]
                    if next_p > start_p:
                        end_p = min(next_p - 1, total_pages)
                
                chapters.append({
                    "title": title,
                    "title_ar": title,
                    "page_start": start_p,
                    "page_end": end_p,
                    "start_page": start_p,
                    "end_page": end_p,
                    "concepts": [f"Concept {idx+1}.1", f"Concept {idx+1}.2"],
                    "concepts_ar": [f"مفهوم {idx+1}.١", f"مفهوم {idx+1}.٢"]
                })
                
    # 2. Fallback to page heading blocks
    if not chapters:
        print("[Assemble] Native TOC empty. Compiling fallback outline from headings...", flush=True)
        pages_list = []
        if is_local or not is_mongodb_enabled():
            if os.path.exists(LOCAL_DB_PATH):
                try:
                    with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                        db = json.load(f)
                    pages_list = [p for p in db.get("book_pages", []) if p.get("book_id") == book_id]
                except Exception:
                    pass
        if is_mongodb_enabled():
            try:
                from pymongo import MongoClient
                client = MongoClient(get_mongodb_uri())
                db = client["fahem"]
                pages_list = list(db["book_pages"].find({"book_id": book_id}))
                client.close()
            except Exception:
                pass
                
        pages_list = sorted(pages_list, key=lambda p: p.get("page_number", 1))
        
        current_ch_title_en = None
        current_ch_title_ar = None
        start_page = 1
        
        for idx, p in enumerate(pages_list):
            p_num = p.get("page_number", idx + 1)
            blocks = p.get("blocks", [])
            i18n = p.get("i18n", {})
            
            # Find any level 1 heading block on this page
            heading_en = ""
            heading_ar = ""
            for b in blocks:
                if b.get("type") == "heading" and b.get("level") == 1:
                    heading_en = b.get("text", "")
                    # Fetch Arabic from i18n
                    b_id = b["id"]
                    if b_id in i18n and "ar" in i18n[b_id] and "text" in i18n[b_id]["ar"]:
                        heading_ar = i18n[b_id]["ar"]["text"]
                    break
            
            if heading_en:
                if current_ch_title_en is not None and p_num > start_page:
                    chapters.append({
                        "title": current_ch_title_en,
                        "title_ar": current_ch_title_ar or current_ch_title_en,
                        "page_start": start_page,
                        "page_end": p_num - 1,
                        "start_page": start_page,
                        "end_page": p_num - 1,
                        "concepts": ["Overview", "Foundations"],
                        "concepts_ar": ["نظرة عامة", "الأساسيات"]
                    })
                current_ch_title_en = heading_en
                current_ch_title_ar = heading_ar or heading_en
                start_page = p_num
                
        # Append last chapter
        if current_ch_title_en is not None:
            chapters.append({
                "title": current_ch_title_en,
                "title_ar": current_ch_title_ar or current_ch_title_en,
                "page_start": start_page,
                "page_end": total_pages,
                "start_page": start_page,
                "end_page": total_pages,
                "concepts": ["Overview", "Summary Concepts"],
                "concepts_ar": ["نظرة عامة", "ملخص المفاهيم"]
            })
            
    # 3. Ultimate Fallback
    if not chapters:
        chapters = [{
            "title": "Chapter 1: Curriculum Overview",
            "title_ar": "الفصل 1: نظرة عامة على المنهج الدراسي",
            "page_start": 1,
            "page_end": total_pages,
            "start_page": 1,
            "end_page": total_pages,
            "concepts": ["Syllabus Objectives", "Academic Core Topics"],
            "concepts_ar": ["أهداف المنهج", "موضوعات الدراسة الأساسية"]
        }]
        
    return chapters

def build_mind_map(chapters):
    """
    Builds a deterministic interactive mind map structure matching the heading hierarchy.
    """
    nodes = []
    links = []
    
    # Core Book Node
    nodes.append({
        "id": "book_root",
        "label": "Textbook Mind Map",
        "labelAr": "خريطة المفاهيم للكتاب",
        "type": "book",
        "parentId": None,
        "completed": False
    })
    
    last_ch_id = None
    last_concept_id = None
    
    for idx, ch in enumerate(chapters):
        ch_id = f"chapter_{idx + 1}"
        page_start = ch.get("page_start", 1)
        
        nodes.append({
            "id": ch_id,
            "label": ch.get("title", f"Chapter {idx+1}"),
            "labelAr": ch.get("title_ar", f"الفصل {idx+1}"),
            "type": "chapter",
            "page": page_start,
            "parentId": "book_root",
            "completed": False
        })
        
        # Link Book -> Chapter
        links.append({
            "source": "book_root",
            "target": ch_id,
            "type": "hierarchical"
        })
        
        # Link sequential chapters together
        if last_ch_id:
            links.append({
                "source": last_ch_id,
                "target": ch_id,
                "type": "progression"
            })
        last_ch_id = ch_id
        
        # Chapter Concepts
        concepts = ch.get("concepts", [])
        concepts_ar = ch.get("concepts_ar", [])
        
        for c_idx, concept in enumerate(concepts[:4]):
            concept_id = f"concept_{idx + 1}_{c_idx + 1}"
            label_ar = concepts_ar[c_idx] if c_idx < len(concepts_ar) else None
            
            nodes.append({
                "id": concept_id,
                "label": concept,
                "labelAr": label_ar,
                "type": "concept",
                "page": page_start + c_idx,
                "parentId": ch_id,
                "completed": False
            })
            
            # Link Chapter -> Concept
            links.append({
                "source": ch_id,
                "target": concept_id,
                "type": "hierarchical"
            })
            
            # Link sequential concepts together
            if last_concept_id:
                links.append({
                    "source": last_concept_id,
                    "target": concept_id,
                    "type": "progression"
                })
            last_concept_id = concept_id
            
    return {
        "nodes": nodes,
        "links": links
    }

def generate_book_cover(book_id, subject_id, title, grade, term):
    """
    Pillow image drawing logic to build premium glassmorphic covers.
    """
    covers_dir = os.path.join(ROOT_DIR, "web", "public", "book_covers")
    if not os.path.exists(os.path.join(ROOT_DIR, "web")):
        covers_dir = os.path.join(ROOT_DIR, "public", "book_covers")
    os.makedirs(covers_dir, exist_ok=True)
    
    full_path = os.path.join(covers_dir, f"{book_id}_full.png")
    thumb_path = os.path.join(covers_dir, f"{book_id}_thumb.jpg")
    
    # Establish subject-based palettes
    if subject_id == "subj_algebra_stats":
        c1, c2 = (15, 32, 67), (30, 150, 160)
        subj_label = "PURE MATHEMATICS"
    elif subject_id == "subj_biology":
        c1, c2 = (10, 24, 50), (120, 40, 200)
        subj_label = "LIFE SCIENCES"
    elif subject_id == "subj_arabic_grammar":
        c1, c2 = (80, 12, 24), (180, 120, 20)
        subj_label = "ARABIC CLASSICS"
    else:
        c1, c2 = (25, 35, 60), (80, 120, 170)
        subj_label = "CURRICULUM TEXTBOOK"
        
    width, height = 800, 1200
    base = Image.new("RGBA", (width, height), (255, 255, 255, 255))
    draw = ImageDraw.Draw(base)
    
    # Render gradient
    for y in range(height):
        ratio = y / height
        r = int(c1[0] * (1 - ratio) + c2[0] * ratio)
        g = int(c1[1] * (1 - ratio) + c2[1] * ratio)
        b = int(c1[2] * (1 - ratio) + c2[2] * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
        
    # Vector designs
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.ellipse([50, 150, 750, 850], fill=(255, 255, 255, 12))
    overlay_draw.ellipse([150, 350, 850, 1050], fill=(255, 255, 255, 8))
    
    img = Image.alpha_composite(base, overlay)
    
    # Draw glassmorphic overlay
    card = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    card_draw = ImageDraw.Draw(card)
    card_draw.rounded_rectangle([80, 320, 720, 880], radius=28, fill=(255, 255, 255, 32), outline=(255, 255, 255, 75), width=3)
    img = Image.alpha_composite(img, card)
    
    draw = ImageDraw.Draw(img)
    
    # Text drawing
    # Safely load default font to avoid system font path issues
    try:
        font_title = ImageFont.truetype("arial.ttf", 46)
        font_sub = ImageFont.truetype("arial.ttf", 24)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        
    # Write text
    draw.text((120, 420), subj_label, fill=(255, 255, 255, 180), font=font_sub)
    draw.text((120, 480), title[:25], fill=(255, 255, 255, 255), font=font_title)
    draw.text((120, 580), f"Grade: {grade} • {term}", fill=(255, 255, 255, 220), font=font_sub)
    
    # Save files
    img.save(full_path, "PNG")
    
    # Convert to thumbnail
    img_rgb = img.convert("RGB")
    img_rgb.thumbnail((240, 360))
    img_rgb.save(thumb_path, "JPEG", quality=85)
    
    # Return virtual public URLs
    return f"/book_covers/{book_id}_full.png", f"/book_covers/{book_id}_thumb.jpg"

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
    pdf_toc = payload.get("pdf_toc", [])
    logs = payload.get("ingestion_logs", [])
    
    job_id = f"job_{book_id}"
    
    # Compile Table of Contents chapters structure
    compiled_chapters = compile_chapters_and_toc(book_id, total_pages, is_local, pdf_toc)
    
    # Programmatic professional book cover generation
    title = payload.get("title") or "Curriculum Textbook"
    grade = payload.get("grade", "General")
    term = payload.get("term", "Term 1")
    cover_url, cover_thumb_url = generate_book_cover(book_id, subject_id, title, grade, term)
    
    # Compile interactive mind map
    mind_map = build_mind_map(compiled_chapters)
    
    metadata = {
        "book_id": book_id,
        "subject_id": subject_id,
        "title": title,
        "title_ar": payload.get("title_ar"),
        "source_url": payload.get("source_url"),
        "storage_path": payload.get("storage_path"),
        "grade": grade,
        "term": term,
        "year": payload.get("year"),
        "language": payload.get("language"),
        "book_type": payload.get("book_type"),
        "userId": payload.get("userId"),
        "chapters": compiled_chapters,
        "coverUrl": cover_url,
        "coverThumbUrl": cover_thumb_url,
        "mindMap": mind_map
    }

    t_str = time.strftime("%H:%M:%S")
    logs.append(f"[{t_str}] [ASSEMBLE] Job 4: Compiled Table of Contents outline, interactive mind map tree, and crafted graphical book covers.")
    update_job_status(job_id, "processing", "assemble", 85, logs, total_pages, total_pages, False, is_local, **metadata)

    # Trigger Job 5 (Embed)
    try:
        python_path = sys.executable or "python"
        embed_script = os.path.join(ROOT_DIR, "agents", "ingestion_v2", "job_embed.py")
        
        payload["ingestion_logs"] = logs
        payload.update(metadata)
        
        proc = subprocess.Popen(
            [python_path, embed_script],
            stdin=subprocess.PIPE,
            stdout=sys.stdout,
            stderr=sys.stderr,
            text=True
        )
        proc.stdin.write(JSON_Encoder().encode(payload))
        proc.stdin.close()
        print(f"[JOB 4: ASSEMBLE] Successfully triggered Job 5 (Embed) with PID {proc.pid}", flush=True)

    except Exception as trigger_err:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [CRITICAL] Failed to trigger Job 5: {trigger_err}")
        update_job_status(job_id, "failed", "assemble", 85, logs, total_pages, total_pages, False, is_local, **metadata)
        sys.exit(1)

if __name__ == "__main__":
    main()
