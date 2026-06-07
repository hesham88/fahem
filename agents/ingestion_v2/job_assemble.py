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
import io
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
import json
import time
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageColor

from utils import (
    update_job_status, check_cooperative_control, ROOT_DIR,
    JSON_Encoder, is_mongodb_enabled, get_mongodb_uri, LOCAL_DB_PATH,
    make_progress_bar, get_gemini_config, generate_gemini_image, get_active_db
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
                db = get_active_db(client)
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

def load_subject_metadata(subject_id, is_local):
    """
    Dynamically loads the subject metadata (color and name/name_ar) from the database or local fallback.
    """
    color_hex = "#19203c" # Default deep dark blue
    name_en = "Curriculum Textbook"
    name_ar = "كتاب منهجي"
    
    if is_local or not is_mongodb_enabled():
        if os.path.exists(LOCAL_DB_PATH):
            try:
                with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                    db = json.load(f)
                subjects = db.get("subjects", [])
                for s in subjects:
                    if s.get("_id") == subject_id:
                        if s.get("color"):
                            color_hex = s["color"]
                        if s.get("name"):
                            name_en = s["name"]
                        if s.get("name_ar"):
                            name_ar = s["name_ar"]
                        break
            except Exception:
                pass
    if is_mongodb_enabled():
        try:
            from pymongo import MongoClient
            client = MongoClient(get_mongodb_uri())
            db = get_active_db(client)
            subject = db["subjects"].find_one({"_id": subject_id})
            if subject:
                if subject.get("color"):
                    color_hex = subject["color"]
                if subject.get("name"):
                    name_en = subject["name"]
                if subject.get("name_ar"):
                    name_ar = subject["name_ar"]
            client.close()
        except Exception:
            pass
    return color_hex, name_en, name_ar

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

def ensure_arabic_font():
    """
    Downloads and caches NotoNaskhArabic-Medium.ttf locally if not already present.
    """
    import requests
    fonts_dir = os.path.join(ROOT_DIR, "agents", "fonts")
    os.makedirs(fonts_dir, exist_ok=True)
    font_path = os.path.join(fonts_dir, "NotoNaskhArabic-Medium.ttf")
    
    if os.path.exists(font_path):
        return font_path
        
    font_url = "https://github.com/google/fonts/raw/main/ofl/notonaskharabic/static/NotoNaskhArabic-Medium.ttf"
    print(f"[Fonts] Downloading Noto Naskh Arabic font from {font_url}...", flush=True)
    try:
        response = requests.get(font_url, timeout=30)
        if response.status_code == 200:
            with open(font_path, "wb") as f:
                f.write(response.content)
            print(f"[Fonts] Font cached successfully at {font_path}", flush=True)
            return font_path
        else:
            print(f"[Fonts Warning] Font download returned status code {response.status_code}. Using system default.", file=sys.stderr)
    except Exception as e:
        print(f"[Fonts Warning] Failed to download Arabic font: {e}. Using system default.", file=sys.stderr)
    return None

def has_arabic(text):
    if not text:
        return False
    return any('\u0600' <= char <= '\u06FF' or '\u0750' <= char <= '\u077F' or '\u08A0' <= char <= '\u08FF' or '\uFB50' <= char <= '\uFDFF' or '\uFE70' <= char <= '\uFEFF' for char in text)

def wrap_text(text, font, max_width, max_lines=4):
    """
    Wraps text to fit within max_width using the specified font, limiting to max_lines.
    """
    words = text.split()
    lines = []
    current_line = []
    for word in words:
        test_line = ' '.join(current_line + [word])
        try:
            bbox = font.getbbox(test_line)
            width = bbox[2] - bbox[0]
        except AttributeError:
            width = font.getsize(test_line)[0]
            
        if width <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(' '.join(current_line))
                current_line = [word]
                if len(lines) >= max_lines:
                    break
            else:
                lines.append(word)
                current_line = []
                if len(lines) >= max_lines:
                    break
    if len(lines) < max_lines and current_line:
        lines.append(' '.join(current_line))
        
    if len(lines) >= max_lines:
        last_line = lines[-1]
        if not last_line.endswith("..."):
            lines[-1] = last_line + "..."
    return lines

def draw_premium_text(draw, text, x, y, font, fill, max_width, is_arabic=False):
    """
    Draws text with support for wrapping and Arabic shaping.
    """
    import arabic_reshaper
    from bidi.algorithm import get_display

    if is_arabic:
        lines = wrap_text(text, font, max_width)
        shaped_lines = []
        for line in lines:
            try:
                reshaped = arabic_reshaper.reshape(line)
                bidi_line = get_display(reshaped)
                shaped_lines.append(bidi_line)
            except Exception:
                shaped_lines.append(line)
        
        current_y = y
        for line in shaped_lines:
            draw.text((x, current_y), line, fill=fill, font=font)
            try:
                bbox = font.getbbox(line)
                line_height = (bbox[3] - bbox[1]) + 8
            except AttributeError:
                line_height = font.getsize(line)[1] + 8
            current_y += line_height
    else:
        lines = wrap_text(text, font, max_width)
        current_y = y
        for line in lines:
            draw.text((x, current_y), line, fill=fill, font=font)
            try:
                bbox = font.getbbox(line)
                line_height = (bbox[3] - bbox[1]) + 8
            except AttributeError:
                line_height = font.getsize(line)[1] + 8
            current_y += line_height

def get_storage_bucket_name():
    """
    Dynamically loads the storage bucket name from firebase_secrets.json or storage_secrets.json.
    """
    firebase_secrets_path = os.path.join(ROOT_DIR, "ignore", "firebase_secrets.json")
    if os.path.exists(firebase_secrets_path):
        try:
            with open(firebase_secrets_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                bucket = data.get("storageBucket")
                if bucket:
                    return bucket
        except Exception:
            pass
            
    storage_secrets_path = os.path.join(ROOT_DIR, "ignore", "storage_secrets.json")
    if os.path.exists(storage_secrets_path):
        try:
            with open(storage_secrets_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                secret = data.get("storageSecret")
                if secret:
                    if secret.startswith("gs://"):
                        secret = secret[5:]
                    return secret
        except Exception:
            pass
            
    return "fahem-88d40.firebasestorage.app"

def upload_cover_to_bucket(local_file_path, bucket_name, destination_blob_name):
    """
    Attempts to upload a local file to GCS/Firebase Storage.
    Returns the public URL if successful, or None if offline or failed.
    """
    try:
        from google.cloud import storage
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(destination_blob_name)
        blob.upload_from_filename(local_file_path)
        
        import urllib.parse
        encoded_blob = urllib.parse.quote(destination_blob_name, safe='')
        public_url = f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}/o/{encoded_blob}?alt=media"
        print(f"[Storage] Successfully uploaded {local_file_path} to gs://{bucket_name}/{destination_blob_name}. URL: {public_url}", flush=True)
        return public_url
    except Exception as e:
        print(f"[Storage Warning] Direct GCS upload failed or offline: {e}. Serving via local fallback.", file=sys.stderr, flush=True)
        return None

def generate_book_cover(book_id, subject_id, title, title_ar, grade, term, is_local=True):
    """
    Pillow image drawing logic to build premium glassmorphic covers with Arabic shaping support and dynamic palettes.
    """
    covers_dir = os.path.join(ROOT_DIR, "web", "public", "book_covers")
    if not os.path.exists(os.path.join(ROOT_DIR, "web")):
        covers_dir = os.path.join(ROOT_DIR, "public", "book_covers")
    os.makedirs(covers_dir, exist_ok=True)
    
    full_path = os.path.join(covers_dir, f"{book_id}_full.png")
    thumb_path = os.path.join(covers_dir, f"{book_id}_thumb.jpg")
    
    # Establish subject-based dynamic palettes
    color_hex, subj_name_en, subj_name_ar = load_subject_metadata(subject_id, is_local)
    c2 = hex_to_rgb(color_hex)
    c1 = (max(10, int(c2[0] * 0.15)), max(10, int(c2[1] * 0.15)), max(10, int(c2[2] * 0.15)))
    
    is_ar = has_arabic(title_ar) or has_arabic(title)
    subj_label = subj_name_ar if is_ar else subj_name_en
    active_title = title_ar if (title_ar and is_ar) else title
    
    # Text drawing with proper Arabic fonts and shaping
    font_path = ensure_arabic_font()
    try:
        if font_path and os.path.exists(font_path):
            font_title = ImageFont.truetype(font_path, 42)
            font_sub = ImageFont.truetype(font_path, 22)
        else:
            font_title = ImageFont.truetype("arial.ttf", 42)
            font_sub = ImageFont.truetype("arial.ttf", 22)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    # 1. Attempt Image Agent Base Generation
    image_agent_success = False
    api_key, _ = get_gemini_config()
    
    if api_key:
        prompt = f"A premium, professional, modern and beautiful textbook cover for subject '{subj_label}' with title '{active_title}'. Modern graphical layout, minimalist background, glassmorphism design, highly engaging educational theme."
        print(f"[ASSEMBLE] Calling Gemini Image Agent to generate base background cover...", flush=True)
        try:
            image_agent_success = generate_gemini_image(prompt, api_key, full_path)
            if image_agent_success and os.path.exists(full_path):
                print(f"[ASSEMBLE] Image agent successfully generated base. Composite card overlay will be applied...", flush=True)
                # Load the generated image and apply the premium glassmorphic overlay + text on top
                img = Image.open(full_path).convert("RGBA")
                if img.size != (800, 1200):
                    img = img.resize((800, 1200), Image.Resampling.LANCZOS)
                
                card = Image.new("RGBA", (800, 1200), (0, 0, 0, 0))
                card_draw = ImageDraw.Draw(card)
                # A beautiful semi-transparent glass overlay card (slightly dark to let white text pop on any generated background)
                card_draw.rounded_rectangle([80, 320, 720, 880], radius=28, fill=(15, 23, 42, 160), outline=(255, 255, 255, 75), width=3)
                img = Image.alpha_composite(img, card)
                draw = ImageDraw.Draw(img)
                
                # Write top subject label
                draw_premium_text(draw, subj_label, 120, 360, font_sub, (255, 255, 255, 180), 560, is_arabic=is_ar)
                # Write main title
                draw_premium_text(draw, active_title, 120, 420, font_title, (255, 255, 255, 255), 560, is_arabic=is_ar)
                
                # Write grade and term
                grade_term_text = f"Grade: {grade} • {term}"
                if is_ar:
                    term_ar = "الفصل الأول" if "Term 1" in term else ("الفصل الثاني" if "Term 2" in term else term)
                    grade_term_text = f"الصف: {grade} • {term_ar}"
                draw_premium_text(draw, grade_term_text, 120, 720, font_sub, (255, 255, 255, 220), 560, is_arabic=is_ar)
                
                img.save(full_path, "PNG")
        except Exception as img_err:
            print(f"[ASSEMBLE Warning] Gemini Image Agent failed: {img_err}. Falling back to Pillow vector design.", file=sys.stderr, flush=True)
            image_agent_success = False

    if not image_agent_success:
        print("[ASSEMBLE] Image agent unavailable or failed → used vector cover", flush=True)
        width, height = 800, 1200
        base = Image.new("RGBA", (width, height), (255, 255, 255, 255))
        draw = ImageDraw.Draw(base)
        
        # Render gradient background
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
        
        # Write text with wrap and bidi-shaping support
        draw_premium_text(draw, subj_label, 120, 360, font_sub, (255, 255, 255, 180), 560, is_arabic=is_ar)
        draw_premium_text(draw, active_title, 120, 420, font_title, (255, 255, 255, 255), 560, is_arabic=is_ar)
        
        grade_term_text = f"Grade: {grade} • {term}"
        if is_ar:
            term_ar = "الفصل الأول" if "Term 1" in term else ("الفصل الثاني" if "Term 2" in term else term)
            grade_term_text = f"الصف: {grade} • {term_ar}"
            
        draw_premium_text(draw, grade_term_text, 120, 720, font_sub, (255, 255, 255, 220), 560, is_arabic=is_ar)
        
        # Save vector file locally
        img.save(full_path, "PNG")
    
    # Convert to thumbnail
    img_rgb = Image.open(full_path).convert("RGB")
    img_rgb.thumbnail((240, 360))
    img_rgb.save(thumb_path, "JPEG", quality=85)
    
    # Upload to storage bucket
    bucket_name = get_storage_bucket_name()
    destination_full = f"book_covers/{book_id}_full.png"
    destination_thumb = f"book_covers/{book_id}_thumb.jpg"
    
    bucket_full_url = upload_cover_to_bucket(full_path, bucket_name, destination_full)
    bucket_thumb_url = upload_cover_to_bucket(thumb_path, bucket_name, destination_thumb)
    
    if bucket_full_url and bucket_thumb_url:
        return bucket_full_url, bucket_thumb_url
    else:
        if not is_local:
            raise RuntimeError(f"Failed to upload covers to Firebase Storage bucket '{bucket_name}' in production!")
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
    logs.append(f"[{time.strftime('%H:%M:%S')}] [ASSEMBLE] Compiling Chapters & Table of Contents Outline...")
    compiled_chapters = compile_chapters_and_toc(book_id, total_pages, is_local, pdf_toc)
    bar_toc = make_progress_bar(80.0, width=20)
    log_msg_toc = f"{bar_toc} Chapters & TOC Compiled ({len(compiled_chapters)} chapters)."
    print(f"[JOB 4: ASSEMBLE] {log_msg_toc}", flush=True)
    logs.append(f"[{time.strftime('%H:%M:%S')}] [ASSEMBLE] {log_msg_toc}")

    # Programmatic professional book cover generation
    title = payload.get("title") or "Curriculum Textbook"
    grade = payload.get("grade", "General")
    term = payload.get("term", "Term 1")
    logs.append(f"[{time.strftime('%H:%M:%S')}] [ASSEMBLE] Generating premium professional book cover...")
    cover_url, cover_thumb_url = generate_book_cover(book_id, subject_id, title, payload.get("title_ar"), grade, term, is_local=is_local)
    bar_cover = make_progress_bar(83.0, width=20)
    log_msg_cover = f"{bar_cover} Premium Book Covers generated successfully."
    print(f"[JOB 4: ASSEMBLE] {log_msg_cover}", flush=True)
    logs.append(f"[{time.strftime('%H:%M:%S')}] [ASSEMBLE] {log_msg_cover}")
    
    # Compile interactive mind map
    logs.append(f"[{time.strftime('%H:%M:%S')}] [ASSEMBLE] Building interactive mind map tree...")
    mind_map = build_mind_map(compiled_chapters)
    bar_map = make_progress_bar(85.0, width=20)
    log_msg_map = f"{bar_map} Interactive Mind Map generated successfully."
    print(f"[JOB 4: ASSEMBLE] {log_msg_map}", flush=True)
    logs.append(f"[{time.strftime('%H:%M:%S')}] [ASSEMBLE] {log_msg_map}")
    
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
        SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
        embed_script = os.path.join(SCRIPT_DIR, "job_embed.py")
        
        payload["ingestion_logs"] = logs
        payload.update(metadata)
        
        # To prevent stdout/stderr swallow and ensure visibility in GCP container logs,
        # we write standard streams directly without local file log cache redirection.
        popen_kwargs = {
            "stdin": subprocess.PIPE,
            "stdout": None,
            "stderr": None,
            "text": True,
            "close_fds": True,
            "env": dict(os.environ, PYTHONIOENCODING="utf-8")
        }
        if sys.platform == "win32":
            popen_kwargs["creationflags"] = 0x00000200 | 0x08000000
        else:
            popen_kwargs["start_new_session"] = True

        proc = subprocess.Popen(
            [python_path, embed_script],
            **popen_kwargs
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
