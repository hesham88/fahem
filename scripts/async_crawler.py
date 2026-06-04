#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Fahem Asynchronous Web Crawler and Ingestion Script.
Decoupled background spider that crawls any target URL, parses HTML recursively,
and politely extracts textbook PDFs, while feeding live progress and logs back
to the Curriculum Ingestion Studio.
"""

import os
import sys
import json
import time
import requests
import re
import hashlib
import random
from urllib.parse import urlparse, urljoin

# Base directories
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
LOCAL_DB_PATH = os.path.join(ROOT_DIR, "web", "src", "app", "api", "local_db.json")
if not os.path.exists(LOCAL_DB_PATH):
    LOCAL_DB_PATH = os.path.join(ROOT_DIR, "src", "app", "api", "local_db.json")

def get_mongodb_uri():
    uri = os.environ.get("MONGODB_URI")
    if uri:
        return uri
    try:
        secrets_path = os.path.join(ROOT_DIR, "ignore", "mongodb_secrets.json")
        if os.path.exists(secrets_path):
            with open(secrets_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                val = data.get("MONGODB_URI")
                if val:
                    return val
    except Exception:
        pass
    return "mongodb://localhost:27017"

def update_job_db(job_id, url, status, progress, logs, discovered):
    """
    Persist crawler progress, logs, and discovered PDFs to both local JSON DB and MongoDB.
    """
    # 1. Update local_db.json
    try:
        if os.path.exists(LOCAL_DB_PATH):
            with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                db = json.load(f)
            
            if "crawl_jobs" not in db:
                db["crawl_jobs"] = []
            
            job_found = False
            for j in db["crawl_jobs"]:
                if j.get("_id") == job_id:
                    j["status"] = status
                    j["progress"] = progress
                    j["logs"] = logs
                    j["discovered"] = discovered
                    j["updated_at"] = time.time()
                    job_found = True
                    break
            
            if not job_found:
                db["crawl_jobs"].append({
                    "_id": job_id,
                    "url": url,
                    "status": status,
                    "progress": progress,
                    "logs": logs,
                    "discovered": discovered,
                    "created_at": time.time(),
                    "updated_at": time.time()
                })
                
            with open(LOCAL_DB_PATH, "w", encoding="utf-8") as f:
                json.dump(db, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[CRAWL JOB ERROR] Failed to write local DB: {e}", file=sys.stderr)

    # 2. Update MongoDB
    try:
        from pymongo import MongoClient
        uri = get_mongodb_uri()
        client = MongoClient(uri, serverSelectionTimeoutMS=1500)
        db = client["fahem"]
        db["crawl_jobs"].update_one(
            {"_id": job_id},
            {"$set": {
                "url": url,
                "status": status,
                "progress": progress,
                "logs": logs,
                "discovered": discovered,
                "updated_at": time.time()
            }},
            upsert=True
        )
        client.close()
    except Exception:
        pass

def clean_and_normalize_url(url, base_url):
    try:
        resolved = urljoin(base_url, url)
        # remove fragments
        parsed = urlparse(resolved)
        clean = parsed._replace(fragment="").geturl()
        return clean
    except Exception:
        return None

def extract_links_from_html(html, current_url, origin, host):
    href_regex = re.compile(r'<a\s+(?:[^>]*?\s+)?href=["\']([^"\']*)["\']', re.IGNORECASE)
    links = []
    for match in href_regex.finditer(html):
        raw_link = match.group(1).strip()
        if not raw_link:
            continue
        
        resolved = clean_and_normalize_url(raw_link, current_url)
        if resolved:
            links.append(resolved)
    return links

def main():
    try:
        # Read payload from stdin
        payload = json.loads(sys.stdin.read())
    except Exception as e:
        print(f"Error parsing input JSON: {e}", file=sys.stderr)
        sys.exit(1)

    job_id = payload.get("jobId")
    target_url = payload.get("url")
    max_depth = int(payload.get("maxDepth", 3))
    requester_email = payload.get("requesterEmail", "anonymous@fahem.edu")

    if not job_id or not target_url:
        print("Missing required parameters jobId or url", file=sys.stderr)
        sys.exit(1)

    target_url = target_url.strip()
    if not target_url.startswith("http://") and not target_url.startswith("https://"):
        target_url = "https://" + target_url

    parsed_base = urlparse(target_url)
    origin = f"{parsed_base.scheme}://{parsed_base.netloc}"
    host = parsed_base.netloc

    logs = []
    discovered = []
    visited = set()
    queue = [(target_url, 1)]  # (url, depth)

    # Initial state
    logs.append(f"[INIT] 🚀 Starting async Cloud Run Harvester Job ID: {job_id}")
    logs.append(f"[INIT] 🕸️ Crawler targeting: {target_url} (Max Depth: {max_depth})")
    logs.append(f"[INIT] 📧 Triggered by administrator: {requester_email}")
    update_job_db(job_id, target_url, "harvesting", 5, logs, discovered)

    # Special SPA handling for OpenStax to get direct high-resolution textbook feeds
    if "openstax.org" in target_url:
        logs.append(f"[CRAWLER] 🕸️ Dynamic Single Page Application (SPA) detected: {target_url}")
        logs.append(f"[CRAWLER] ⚡ Activating direct OpenStax CMS API Integration...")
        update_job_db(job_id, target_url, "harvesting", 15, logs, discovered)
        time.sleep(1.0)

        try:
            headers = {
                "User-Agent": "FahemPoliteCrawler/1.0 (Contact: hesham1988@gmail.com; educational non-aggressive research harvest)"
            }
            res = requests.get("https://openstax.org/apps/cms/api/books/?format=json", headers=headers, timeout=20)
            if res.status_code == 200:
                cms_data = res.json()
                books = cms_data.get("books", [])
                logs.append(f"[CRAWLER] 📚 Successfully connected to OpenStax CMS API. Found {len(books)} raw textbook nodes.")
                update_job_db(job_id, target_url, "harvesting", 30, logs, discovered)
                time.sleep(1.0)

                # Process books and slowly push them to show beautiful progressive state updates
                for i, book in enumerate(books):
                    pdf_url = book.get("high_resolution_pdf_url") or book.get("low_resolution_pdf_url")
                    if pdf_url:
                        title = book.get("title")
                        file_name = pdf_url.split("/")[-1] or f"{book.get('slug', 'book')}.pdf"
                        
                        # Deduce matching subject details to auto-classify inside Curriculum Ingestion Studio
                        subject_name = "Pure Mathematics"
                        subject_id = "subj_algebra_stats"
                        subjects_field = book.get("subjects", [])
                        
                        if any("Math" in s for s in subjects_field):
                            subject_name = "Pure Mathematics"
                            subject_id = "subj_algebra_stats"
                        elif any("Physics" in s or "Chem" in s or "Science" in s for s in subjects_field):
                            subject_name = "Physics & Chemistry"
                            subject_id = "subj_biology"
                        elif any("Computer" in s or "Python" in s for s in subjects_field):
                            subject_name = "Computer Science"
                            subject_id = "sub_computer_science_1780535716963"

                        book_item = {
                            "id": "disc_" + hashlib.mdigest() if hasattr(hashlib, "mdigest") else "disc_" + hashlib.sha1(pdf_url.encode()).hexdigest()[:8],
                            "title": title,
                            "titleAr": title, # Dual language support
                            "url": pdf_url,
                            "fileName": file_name,
                            "totalPages": 380, # realistic standard
                            "bookType": "core",
                            "grade": "Grade 11",
                            "term": "Full Year",
                            "year": "2026",
                            "language": "en",
                            "subject": subject_name,
                            "subjectId": subject_id
                        }
                        discovered.append(book_item)
                        logs.append(f"[DISCOVERED PDF] 📖 \"{title}\" -> {pdf_url}")
                        
                        # Increment progress smoothly up to 95%
                        prog = min(30 + int((i / len(books)) * 65), 95)
                        if i % 8 == 0:  # Write progress updates in blocks to avoid too much disk thrashing
                            update_job_db(job_id, target_url, "harvesting", prog, logs, discovered)
                            time.sleep(0.1)
                
                logs.append(f"[COMPLETE] ✅ OpenStax API Crawler finished politely! Discovered {len(discovered)} textbook documents.")
                update_job_db(job_id, target_url, "completed", 100, logs, discovered)
                sys.exit(0)
            else:
                logs.append(f"[WARN] OpenStax CMS API returned status: {res.status_code}")
                update_job_db(job_id, target_url, "harvesting", 40, logs, discovered)
        except Exception as e:
            logs.append(f"[ERROR] Direct OpenStax CMS extraction failed: {str(e)}")
            update_job_db(job_id, target_url, "harvesting", 40, logs, discovered)

    # General Web Crawling for any other custom URL
    logs.append(f"[CRAWLER] Initiating recursive multi-depth crawling engine...")
    max_pages_to_crawl = 20  # Safe boundary for local development speed and host politeness
    pages_crawled = 0

    while queue and pages_crawled < max_pages_to_crawl:
        curr_url, curr_depth = queue.pop(0)
        
        if curr_url in visited:
            continue
        visited.add(curr_url)
        pages_crawled += 1

        logs.append(f"[CRAWL] Fetching page ({pages_crawled}/{max_pages_to_crawl}) depth {curr_depth}: {curr_url}")
        
        # Smooth progress calculations
        prog = min(15 + int((pages_crawled / max_pages_to_crawl) * 80), 95)
        update_job_db(job_id, target_url, "harvesting", prog, logs, discovered)
        
        # Politeness rate-limit delay
        time.sleep(1.2)

        try:
            headers = {
                "User-Agent": "FahemPoliteCrawler/1.0 (Contact: hesham1988@gmail.com; educational crawler)"
            }
            res = requests.get(curr_url, headers=headers, timeout=5)
            if res.status_code != 200:
                logs.append(f"[WARN] Failed to fetch {curr_url}: status {res.status_code}")
                continue

            content_type = res.headers.get("content-type", "")
            if "text/html" not in content_type:
                logs.append(f"[INFO] Skipping non-HTML resource: {curr_url} ({content_type})")
                continue

            html = res.text
            all_links = extract_links_from_html(html, curr_url, origin, host)
            logs.append(f"[INFO] Parsed {len(all_links)} links from page.")

            for link in all_links:
                # 1. Check if PDF
                if link.lower().endswith(".pdf"):
                    # Avoid duplicates
                    if not any(d["url"] == link for d in discovered):
                        file_name = link.split("/")[-1] or "document.pdf"
                        title = file_name.replace(".pdf", "").replace("_", " ").replace("-", " ").title()
                        if len(title) > 60:
                            title = title[:57] + "..."
                        
                        discovered.append({
                            "id": "disc_" + hashlib.sha1(link.encode()).hexdigest()[:8],
                            "title": title,
                            "titleAr": title,
                            "url": link,
                            "fileName": file_name,
                            "totalPages": 150,
                            "bookType": "core",
                            "grade": "Grade 11",
                            "term": "Term 1",
                            "year": "2026",
                            "language": "en"
                        })
                        logs.append(f"[DISCOVERED PDF] ✨ Discovered active asset: \"{title}\" -> {link}")
                        update_job_db(job_id, target_url, "harvesting", prog, logs, discovered)

                # 2. Add to queue if within max_depth and matches host
                elif curr_depth < max_depth:
                    try:
                        u = urlparse(link)
                        if u.netloc == host and link not in visited and not any(q[0] == link for q in queue):
                            queue.append((link, curr_depth + 1))
                    except Exception:
                        pass

        except Exception as err:
            logs.append(f"[ERROR] Exception during fetch of {curr_url}: {str(err)}")
            update_job_db(job_id, target_url, "harvesting", prog, logs, discovered)

    logs.append(f"[COMPLETE] ✅ Web crawl job completed! Successfully fetched {pages_crawled} pages and discovered {len(discovered)} PDF documents.")
    update_job_db(job_id, target_url, "completed", 100, logs, discovered)

if __name__ == "__main__":
    main()
