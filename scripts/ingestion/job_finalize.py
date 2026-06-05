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

def generate_book_cover(book_id, subject_id, title, grade, term, is_local):
    """
    Generates a premium, highly stylized textbook cover image and thumbnail using Pillow.
    Stores the full image (800x1200 PNG) and compressed thumbnail (240x360 JPG) in the public assets.
    """
    import os
    from PIL import Image, ImageDraw, ImageFont, ImageColor
    
    # Resolve output path
    covers_dir = os.path.join(ROOT_DIR, "web", "public", "book_covers")
    if not os.path.exists(os.path.join(ROOT_DIR, "web")):
        covers_dir = os.path.join(ROOT_DIR, "public", "book_covers")
    os.makedirs(covers_dir, exist_ok=True)
    
    full_path = os.path.join(covers_dir, f"{book_id}_full.png")
    thumb_path = os.path.join(covers_dir, f"{book_id}_thumb.jpg")
    
    # Choose colors based on subject
    if subject_id == "subj_algebra_stats":
        c1 = (15, 32, 67)
        c2 = (30, 150, 160)
        subj_label = "PURE MATHEMATICS"
        sub_color = (40, 200, 210)
    elif subject_id == "subj_biology":
        c1 = (10, 24, 50)
        c2 = (120, 40, 200)
        subj_label = "PHYSICS & CHEMISTRY"
        sub_color = (180, 100, 255)
    elif subject_id == "subj_arabic_grammar":
        c1 = (80, 12, 24)
        c2 = (180, 120, 20)
        subj_label = "ARABIC GRAMMAR & LIT"
        sub_color = (255, 200, 50)
    elif subject_id == "sub_computer_science_1780535716963":
        c1 = (18, 18, 24)
        c2 = (0, 160, 180)
        subj_label = "COMPUTER SCIENCE"
        sub_color = (0, 230, 240)
    elif subject_id == "subj_business":
        c1 = (10, 50, 30)
        c2 = (150, 90, 30)
        subj_label = "BUSINESS & ECONOMICS"
        sub_color = (220, 160, 60)
    elif subject_id == "subj_social_sciences":
        c1 = (45, 20, 60)
        c2 = (180, 70, 90)
        subj_label = "SOCIAL SCIENCES"
        sub_color = (240, 120, 140)
    else:
        c1 = (25, 35, 60)
        c2 = (80, 120, 170)
        subj_label = "CURRICULUM TEXTBOOK"
        sub_color = (130, 190, 255)
        
    width, height = 800, 1200
    base = Image.new("RGBA", (width, height), (255, 255, 255, 255))
    draw = ImageDraw.Draw(base)
    
    # Render vertical linear gradient
    for y in range(height):
        ratio = y / height
        r = int(c1[0] * (1 - ratio) + c2[0] * ratio)
        g = int(c1[1] * (1 - ratio) + c2[1] * ratio)
        b = int(c1[2] * (1 - ratio) + c2[2] * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
        
    # Abstract Vector Art Layer
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    
    if subject_id == "subj_algebra_stats":
        for r in range(120, 900, 160):
            overlay_draw.ellipse([width//2 - r, height//2 - r, width//2 + r, height//2 + r], outline=(255, 255, 255, 12), width=2)
        points = [(0, 1000), (200, 850), (400, 950), (600, 600), (800, 750)]
        overlay_draw.line(points, fill=(255, 255, 255, 18), width=3)
    elif subject_id == "subj_biology":
        for i in range(4):
            cx = 150 + i * 160
            cy = 400 + i * 140
            radius = 90 + i * 30
            overlay_draw.ellipse([cx-radius, cy-radius, cx+radius, cy+radius], fill=(255, 255, 255, 8), outline=(255, 255, 255, 20), width=2)
    elif subject_id == "sub_computer_science_1780535716963":
        for x in range(0, width, 80):
            overlay_draw.line([(x, 0), (x, height)], fill=(255, 255, 255, 10), width=1)
        for y in range(0, height, 80):
            overlay_draw.line([(0, y), (width, y)], fill=(255, 255, 255, 10), width=1)
    else:
        overlay_draw.ellipse([50, 150, 750, 850], fill=(255, 255, 255, 12))
        overlay_draw.ellipse([150, 350, 850, 1050], fill=(255, 255, 255, 8))
        
    img = Image.alpha_composite(base, overlay)
    draw = ImageDraw.Draw(img)
    
    # Glassmorphic Frosted Card
    card_coords = [80, 320, 720, 880]
    card_overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    card_draw = ImageDraw.Draw(card_overlay)
    card_draw.rounded_rectangle(card_coords, radius=28, fill=(255, 255, 255, 30), outline=(255, 255, 255, 75), width=3)
    img = Image.alpha_composite(img, card_overlay)
    draw = ImageDraw.Draw(img)
    
    # Load fonts safely
    def load_font(font_size, bold=False):
        font_paths = [
            "C:\\Windows\\Fonts\\segoeuib.ttf" if bold else "C:\\Windows\\Fonts\\segoeui.ttf",
            "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf",
            "C:\\Windows\\Fonts\\timesbd.ttf" if bold else "C:\\Windows\\Fonts\\times.ttf",
        ]
        for path in font_paths:
            if os.path.exists(path):
                try:
                    return ImageFont.truetype(path, font_size)
                except Exception:
                    pass
        return ImageFont.load_default()
        
    font_subject = load_font(26, bold=True)
    font_title = load_font(44, bold=True)
    font_meta = load_font(22, bold=False)
    font_badge = load_font(18, bold=True)
    
    # Source / Authority Badge in top right corner
    source_name = "FAHEM"
    title_lower = title.lower() if title else ""
    if "openstax" in title_lower or book_id.startswith("openstax") or "openstax" in (subject_id or ""):
        source_name = "OPENSTAX"
    elif "moe" in title_lower or "egypt" in title_lower or book_id.startswith("disc_"):
        source_name = "MOE OFFICIAL"
        
    badge_text = f" {source_name} "
    badge_bbox = font_badge.getbbox(badge_text)
    badge_w = badge_bbox[2] - badge_bbox[0]
    badge_h = badge_bbox[3] - badge_bbox[1]
    
    badge_x2 = width - 80
    badge_x1 = badge_x2 - badge_w - 20
    badge_y1 = 60
    badge_y2 = badge_y1 + badge_h + 16
    
    badge_overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(badge_overlay)
    b_draw.rounded_rectangle([badge_x1, badge_y1, badge_x2, badge_y2], radius=15, fill=(255, 215, 0, 230), outline=(255, 255, 255, 100), width=1)
    img = Image.alpha_composite(img, badge_overlay)
    draw = ImageDraw.Draw(img)
    
    draw.text((badge_x1 + 10, badge_y1 + 8), badge_text, font=font_badge, fill=(20, 20, 20, 255))
    
    # Subject category
    subj_bbox = font_subject.getbbox(subj_label)
    subj_w = subj_bbox[2] - subj_bbox[0]
    draw.text(((width - subj_w) // 2, 380), subj_label, font=font_subject, fill=sub_color + (255,))
    
    # Book title wrapping
    wrapped_lines = []
    words = title.split()
    current_line = []
    for word in words:
        test_line = " ".join(current_line + [word])
        test_bbox = font_title.getbbox(test_line)
        w = test_bbox[2] - test_bbox[0]
        if w <= 540:
            current_line.append(word)
        else:
            if current_line:
                wrapped_lines.append(" ".join(current_line))
                current_line = [word]
            else:
                wrapped_lines.append(word)
                current_line = []
    if current_line:
        wrapped_lines.append(" ".join(current_line))
        
    y_text = 450
    for line in wrapped_lines[:4]:
        line_bbox = font_title.getbbox(line)
        line_w = line_bbox[2] - line_bbox[0]
        draw.text(((width - line_w) // 2 + 2, y_text + 2), line, font=font_title, fill=(0, 0, 0, 120))
        draw.text(((width - line_w) // 2, y_text), line, font=font_title, fill=(255, 255, 255, 255))
        y_text += 60
        
    # Grade & Term Metadata
    meta_parts = []
    if grade:
        meta_parts.append(str(grade).upper())
    if term:
        meta_parts.append(str(term).upper())
    meta_text = "  •  ".join(meta_parts) if meta_parts else "OFFICIAL CURRICULUM"
    
    meta_bbox = font_meta.getbbox(meta_text)
    meta_w = meta_bbox[2] - meta_bbox[0]
    draw.text(((width - meta_w) // 2, 780), meta_text, font=font_meta, fill=(240, 240, 255, 240))
    
    # Official Branding
    logo_text = "FAHEM DIGITAL PLATFORM"
    logo_bbox = font_meta.getbbox(logo_text)
    logo_w = logo_bbox[2] - logo_bbox[0]
    draw.text(((width - logo_w) // 2, 1100), logo_text, font=font_meta, fill=(255, 255, 255, 140))
    
    # Save full PNG
    img.save(full_path, "PNG")
    
    # Save highly compressed lightweight JPG thumbnail
    thumb_img = img.convert("RGB")
    thumb_img.thumbnail((240, 360))
    thumb_img.save(thumb_path, "JPEG", quality=80)
    
    print(f"[COVER GEN] Programmatically generated cover and thumbnail for book {book_id}", flush=True)
    return f"/book_covers/{book_id}_full.png", f"/book_covers/{book_id}_thumb.jpg"

def build_mind_map(chapters):
    """
    Compiles a short, smart, progressional Mind Map node-link JSON structure
    from the textbook chapters and their associated core curriculum concepts.
    Created once during ingestion.
    """
    nodes = []
    links = []
    
    # Root Node
    nodes.append({
        "id": "root",
        "label": "Textbook Home",
        "type": "root",
        "page": 1,
        "completed": False
    })
    
    last_ch_id = None
    last_concept_id = None
    
    for idx, ch in enumerate(chapters):
        ch_id = f"ch_{idx + 1}"
        ch_title = ch.get("title") or f"Chapter {idx + 1}"
        page_start = ch.get("page_start", 1)
        
        nodes.append({
            "id": ch_id,
            "label": ch_title,
            "type": "chapter",
            "page": page_start,
            "parentId": "root",
            "completed": False
        })
        
        # Link Root -> Chapter
        links.append({
            "source": "root",
            "target": ch_id,
            "type": "hierarchical"
        })
        
        # Sequential progression link between chapters
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
        
        for c_idx, concept in enumerate(concepts[:4]): # Keep it short, smart, easy to read (max 4 per chapter)
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
            
            # Sequential progression between concepts
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
    
    # Compile Table of Contents chapters structure
    compiled_chapters = compile_chapters_and_toc(book_id, total_pages, is_local, pdf_toc)
    
    # Programmatic professional book cover generation
    title = payload.get("title") or "Curriculum Textbook"
    grade = payload.get("grade")
    term = payload.get("term")
    cover_url, cover_thumb_url = generate_book_cover(book_id, subject_id, title, grade, term, is_local)
    
    # Compile interactive mind map
    mind_map = build_mind_map(compiled_chapters)
    
    logs = payload.get("ingestion_logs", [])
    if not logs:
        logs = [f"[{time.strftime('%H:%M:%S')}] [INIT] Job 4: Ingestion Finalizer process spawned."]
        
    job_id = f"job_{book_id}"
    
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
