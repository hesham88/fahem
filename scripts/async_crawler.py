#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Fahem Asynchronous Web Crawler and Ingestion Script.
Decoupled background spider that crawls any target URL, parses HTML recursively,
and politely extracts textbook PDFs, while feeding live progress and logs back
to the Curriculum Ingestion Studio.
"""

from __future__ import annotations

import os
import sys
import json
import time
import re
import hashlib
import asyncio
from dataclasses import asdict, dataclass, field
from typing import Any, Callable, Optional
from urllib.parse import urlparse, urljoin

import httpx

# Base directories
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
LOCAL_DB_PATH = os.path.join(ROOT_DIR, "web", "src", "app", "api", "local_db.json")
if not os.path.exists(LOCAL_DB_PATH):
    LOCAL_DB_PATH = os.path.join(ROOT_DIR, "src", "app", "api", "local_db.json")

# Ensure parent directories are on PATH to resolve tools
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
# Also add agent's directory if called from elsewhere
AGENT_DIR = os.path.join(ROOT_DIR, "agents")
if os.path.exists(AGENT_DIR) and AGENT_DIR not in sys.path:
    sys.path.insert(0, AGENT_DIR)

USER_AGENT = (
    "FahemCrawlerExplorer/2.0 (+educational research; non-aggressive, contact: hesham1988@gmail.com)"
)
OPENSTAX_LISTING = "https://openstax.org/apps/cms/api/books/?format=json"

# Emit callback signature: emit(kind: str, payload: dict). kinds: "log" | "progress"
Emit = Callable[[str, dict], None]


# --------------------------------------------------------------------------- #
# MongoDB configuration and update helpers
# --------------------------------------------------------------------------- #
def get_mongodb_uri():
    # 1. Prioritize a pre-resolved, cached URI passed via the environment (completely bypasses SRV/DNS)
    resolved_env = os.environ.get("RESOLVED_MONGODB_URI")
    if resolved_env and resolved_env.startswith("mongodb://") and not resolved_env.startswith("mongodb+srv://"):
        return resolved_env

    # 2. Check standard MONGODB_URI. If it's already fully resolved, use it directly
    uri = os.environ.get("MONGODB_URI")
    if uri and uri.startswith("mongodb://") and not uri.startswith("mongodb+srv://"):
        return uri

    # 3. Dynamic resolution via tools helper
    try:
        from tools import resolve_srv_to_mongodb_uri
        to_resolve = resolved_env or uri
        if to_resolve and to_resolve.startswith("mongodb+srv://"):
            res = resolve_srv_to_mongodb_uri(to_resolve)
            if res and not res.startswith("mongodb+srv://"):
                return res
    except Exception:
        pass

    try:
        from tools import get_mongodb_uri as resolve_uri
        res = resolve_uri()
        if res and not res.startswith("mongodb+srv://"):
            return res
    except Exception:  # Catch all exceptions (ImportError, NameError, etc.) to ensure absolute robustness
        pass

    # 4. Fallback to standard MONGODB_URI if any (if already resolved or as a last resort)
    if uri:
        return uri

    # 5. Local secrets file fallback
    try:
        secrets_path = os.path.join(ROOT_DIR, "ignore", "mongodb_secrets.json")
        if os.path.exists(secrets_path):
            with open(secrets_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                val = data.get("MONGODB_URI")
                if val:
                    from tools import resolve_srv_to_mongodb_uri
                    res = resolve_srv_to_mongodb_uri(val)
                    return res
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
                    j["active_pid"] = os.getpid()
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
                    "updated_at": time.time(),
                    "active_pid": os.getpid()
                })
                
            with open(LOCAL_DB_PATH, "w", encoding="utf-8") as f:
                json.dump(db, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[CRAWL JOB ERROR] Failed to write local DB: {e}", file=sys.stderr)

    # 2. Update MongoDB
    try:
        if not os.environ.get("K_SERVICE"):
            return
        uri = get_mongodb_uri()
        if not uri:
            return
        if "-pri" in uri.lower() and not os.environ.get("K_SERVICE"):
            return
        from pymongo import MongoClient
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
    except Exception as mongo_err:
        print(f"[CRAWL JOB MONGO ERROR] Failed to update MongoDB: {mongo_err}", file=sys.stderr)


def check_cancel_requested(job_id: str) -> bool:
    """
    Check if cancellation is requested for this job in MongoDB or local JSON DB.
    """
    if not job_id:
        return False
    # 1. Check local_db.json
    try:
        if os.path.exists(LOCAL_DB_PATH):
            with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                db_data = json.load(f)
            for j in db_data.get("crawl_jobs", []):
                if j.get("_id") == job_id:
                    if j.get("cancel_requested"):
                        return True
    except Exception:
        pass

    # 2. Check MongoDB
    try:
        uri = get_mongodb_uri()
        if uri:
            from pymongo import MongoClient
            client = MongoClient(uri, serverSelectionTimeoutMS=800)
            db = client["fahem"]
            job = db["crawl_jobs"].find_one({"_id": job_id}, {"cancel_requested": 1})
            client.close()
            if job and job.get("cancel_requested"):
                return True
    except Exception:
        pass
    return False


# --------------------------------------------------------------------------- #
# Classifiers and normalization helpers
# --------------------------------------------------------------------------- #
_AR_RE = re.compile(r"[؀-ۿ]")


def _has_arabic(text: str) -> bool:
    return bool(_AR_RE.search(text or ""))


def normalize_grade(grade_str):
    g = (grade_str or "").lower()
    if "secondry1" in g or "الصف الأول الثانوي" in g or "sec1" in g:
        return "Grade 10"
    if "secondry2" in g or "الصف الثاني الثانوي" in g or "sec2" in g:
        return "Grade 11"
    if "secondry3" in g or "الصف الثالث الثانوي" in g or "sec3" in g:
        return "Grade 12"
    if "prep1" in g or "الصف الأول الإعدادي" in g:
        return "Grade 7"
    if "prep2" in g or "الصف الثاني الإعدادي" in g:
        return "Grade 8"
    if "prep3" in g or "الصف الثالث الإعدادي" in g:
        return "Grade 9"
    return grade_str or "Grade 11"


def normalize_term(term_str):
    t = (term_str or "").lower()
    if "term1" in t or "الأول" in t or "first" in t:
        return "Term 1"
    if "term2" in t or "الثاني" in t or "second" in t:
        return "Term 2"
    return term_str or "Term 1"


def classify_subject_by_text(title, file_name, url, subjects_list=None):
    """
    Classify a textbook into the exact matching subject structure.
    Prioritizes official subject categories (like OpenStax tags) for 100% accurate mapping,
    and uses robust full-word keyword matching as a safe fallback.
    """
    title_lower = title.lower() if title else ""
    file_lower = file_name.lower() if file_name else ""
    url_lower = url.lower() if url else ""
    
    # 1. Exact map using explicit subjects list if provided (e.g. OpenStax categories)
    if subjects_list:
        for s in subjects_list:
            if not s:
                continue
            s_clean = s.strip() if isinstance(s, str) else str(s).strip()
            s_lower = s_clean.lower()
            
            if "computer science" in s_lower:
                return "Computer Science", "sub_computer_science_1780535716963"
            elif s_lower in ["math", "mathematics"]:
                return "Pure Mathematics", "subj_algebra_stats"
            elif s_lower in ["science", "physics", "chemistry", "biology", "nursing"]:
                return "Physics & Chemistry", "subj_biology"
            elif "business" in s_lower or "economics" in s_lower or "finance" in s_lower:
                return "Business & Economics", "subj_business"
            elif s_lower in ["social sciences", "humanities", "college success", "history", "psychology", "sociology"]:
                return "Social Sciences & Humanities", "subj_social_sciences"

    # 2. Extract words from title & file name to avoid substring matching bugs (like matching "math" inside "polymath")
    text_to_check = f"{title_lower} {file_lower}"
    words = set(re.findall(r'[a-z\u0600-\u06ff]+', text_to_check))

    def has_any_word(kws):
        return any(kw in words for kw in kws)

    # 3. Computer Science
    cs_keywords = ["computer", "python", "programming", "software", "coding", "java", "algorithms", "c++", "html", "javascript", "developer", "scratch", "it", "حاسب", "حاسب آلي", "برمجة", "تكنولوجيا", "اتصالات", "معلومات"]
    if has_any_word(cs_keywords):
        return "Computer Science", "sub_computer_science_1780535716963"

    # 4. Pure Mathematics
    math_keywords = ["math", "algebra", "trigonometry", "calculus", "stats", "statistics", "precalculus", "geometry", "prealgebra", "linear algebra", "discrete math", "matematik", "mathematics", "رياضيات", "جبر", "هندسة", "تفاضل", "تكامل", "إحصاء", "ميكانيكا", "مثلثات"]
    if has_any_word(math_keywords) or any(kw in url_lower for kw in ["/math/", "/algebra", "/calculus"]):
        return "Pure Mathematics", "subj_algebra_stats"

    # 5. Physics & Chemistry / General Science / Biology
    science_keywords = ["physics", "chemistry", "biology", "science", "anatomy", "physiology", "microbiology", "nursing", "pharmacology", "organic chemistry", "biochemistry", "geology", "astronomy", "botany", "zoology", "فيزياء", "كيمياء", "أحياء", "علوم", "بيولوجي"]
    if has_any_word(science_keywords) or any(kw in url_lower for kw in ["/science/", "/physics", "/chemistry", "/biology"]):
        return "Physics & Chemistry", "subj_biology"

    # 6. Arabic Grammar & Literature
    arabic_keywords = ["arabic", "grammar", "literature", "عربي", "نحو", "بلاغة", "أدب", "لغة عربية", "مطالعة", "نصوص", "صرف"]
    if has_any_word(arabic_keywords):
        return "Arabic Grammar & Literature", "subj_arabic_grammar"

    # 7. Business & Economics
    business_keywords = ["business", "economics", "finance", "accounting", "management", "marketing", "entrepreneurship", "ethics", "macroeconomics", "microeconomics", "commerce", "اقتصاد", "مالية", "محاسبة", "إدارة", "تجارة"]
    if has_any_word(business_keywords):
        return "Business & Economics", "subj_business"

    # 8. Default to Social Sciences & Humanities
    return "Social Sciences & Humanities", "subj_social_sciences"


# --------------------------------------------------------------------------- #
# Data models and OpenStax and Generic adapters
# --------------------------------------------------------------------------- #
@dataclass
class BookRef:
    source: str
    title: str
    url: str = ""               # the PDF url ("real path")
    file_name: str = ""
    path: str = ""              # url path component
    subject: str = ""
    category: str = ""
    stage: str = ""
    grade: str = ""
    term: str = ""
    type: str = ""
    language: str = ""
    size_bytes: Optional[int] = None
    http_status: Optional[int] = None
    detail_url: str = ""
    book_id: str = ""

    def __post_init__(self) -> None:
        if self.url and not self.file_name:
            self.file_name = os.path.basename(urlparse(self.url).path) or "document.pdf"
        if self.url and not self.path:
            self.path = urlparse(self.url).path
        if not self.language and self.title:
            self.language = "ar" if _has_arabic(self.title) else "en"





def _ox_subject(node: dict) -> str:
    subs = node.get("book_subjects") or []
    names = [s.get("subject_name") for s in subs if s.get("subject_name")]
    return names[0] if names else "General"


def _ox_category(node: dict) -> str:
    cats = node.get("book_categories") or []
    for c in cats:
        v = c.get("subject_category")
        if v:
            return v
    return ""


async def _ox_list_nodes(client: httpx.AsyncClient, listing_url: str, emit: Emit) -> tuple[list[dict], int]:
    """Enumerate OpenStax book nodes, resilient to the API."""
    try:
        r = await client.get(listing_url, headers={"User-Agent": USER_AGENT}, follow_redirects=False)
        if r.status_code == 200:
            j = r.json()
            items = j.get("items") or j.get("books")
            if items:
                return items, int(j.get("meta", {}).get("total_count", len(items)))
        emit("log", {"text": f"aggregate books endpoint → {r.status_code}; using Wagtail v2 pages API", "level": "warn"})
    except Exception as exc:
        emit("log", {"text": f"aggregate endpoint error ({type(exc).__name__}); using Wagtail v2 pages API", "level": "warn"})

    parsed = urlparse(listing_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    fields = "book_subjects,book_categories"
    items: list[dict] = []
    offset = 0
    total: Optional[int] = None
    while True:
        url = f"{origin}/apps/cms/api/v2/pages/?type=books.Book&format=json&limit=20&offset={offset}"
        if fields:
            url += f"&fields={fields}"
        r = await client.get(url, headers={"User-Agent": USER_AGENT}, follow_redirects=True, timeout=30.0)
        if r.status_code == 400 and fields:
            fields = ""
            continue
        r.raise_for_status()
        j = r.json()
        batch = j.get("items", [])
        items.extend(batch)
        total = int(j.get("meta", {}).get("total_count", len(items)))
        offset += len(batch)
        emit("progress", {"pct": min(8 + len(items) // 8, 14)})
        if not batch or len(items) >= total:
            break
    emit("log", {"text": f"Wagtail v2 enumerated {len(items)} book pages", "level": "info"})
    return items, (total or len(items))


async def probe_pdf_page_count(client, url, cap_bytes=28_000_000, timeout=10):
    """Best-effort REAL page count for the discovery tree: stream the PDF (size/time capped)
    and count pages via PyMuPDF. Returns an int, or None when it can't be determined cheaply
    (then the authoritative count is set at the fetch stage). Replaces the fabricated 380."""
    if not url:
        return None
    try:
        import fitz  # PyMuPDF
    except Exception:
        return None
    try:
        buf = bytearray()
        async with client.stream("GET", url, timeout=timeout) as resp:
            if resp.status_code != 200:
                return None
            async for chunk in resp.aiter_bytes():
                buf.extend(chunk)
                if len(buf) > cap_bytes:
                    break

        def _count(data):
            try:
                d = fitz.open(stream=bytes(data), filetype="pdf")
                n = d.page_count
                d.close()
                return n if n and n > 0 else None
            except Exception:
                return None

        return await asyncio.to_thread(_count, buf)
    except Exception:
        return None


async def discover_openstax(
    client: httpx.AsyncClient, listing_url: str, emit: Emit, discovered: list[dict], job_id: str = ""
) -> list[BookRef]:
    emit("log", {"text": f"OpenStax CMS listing: GET {listing_url}", "level": "info"})
    items, total = await _ox_list_nodes(client, listing_url, emit)
    if not items:
        emit("log", {"text": "OpenStax: no book nodes enumerated.", "level": "warn"})
        return []
    emit("log", {"text": f"OpenStax catalog: {total} nodes (resolving PDFs via detail_url)...", "level": "ok"})

    sem = asyncio.Semaphore(8)
    books: list[BookRef] = []
    no_pdf: list[str] = []
    done = 0

    async def resolve(node: dict) -> None:
        nonlocal done
        if job_id and check_cancel_requested(job_id):
            raise asyncio.CancelledError("Cancellation requested")
        title = node.get("title", "Untitled")
        meta = node.get("meta", {}) or {}
        detail_url = meta.get("detail_url", "")
        subject = _ox_subject(node)
        category = _ox_category(node)
        pdf_url = node.get("high_resolution_pdf_url") or node.get("low_resolution_pdf_url")
        async with sem:
            try:
                if job_id and check_cancel_requested(job_id):
                    raise asyncio.CancelledError("Cancellation requested")
                if (not pdf_url or subject == "General" or not category) and detail_url:
                    d = await client.get(
                        detail_url, headers={"User-Agent": USER_AGENT}, timeout=25.0, follow_redirects=True
                    )
                    if d.status_code == 200:
                        dj = d.json()
                        pdf_url = pdf_url or dj.get("high_resolution_pdf_url") or dj.get("low_resolution_pdf_url")
                        if subject == "General":
                            subject = _ox_subject(dj)
                        if not category:
                            category = _ox_category(dj)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                emit("log", {"text": f"detail fetch failed for '{title}': {exc}", "level": "warn"})
        done += 1
        emit("progress", {"pct": 15 + int(done / max(len(items), 1) * 60)})
        if pdf_url:
            b_ref = BookRef(
                source="openstax", title=title, url=pdf_url, subject=subject,
                category=category, language=meta.get("locale", "en"),
                detail_url=detail_url, book_id=meta.get("slug", str(node.get("id", ""))),
            )
            books.append(b_ref)
            
            subject_name, subject_id = classify_subject_by_text(b_ref.title, b_ref.file_name, b_ref.url, [b_ref.subject])
            real_pages = await probe_pdf_page_count(client, b_ref.url)
            book_item = {
                "id": "disc_" + hashlib.sha1(b_ref.url.encode()).hexdigest()[:8],
                "title": b_ref.title,
                "titleAr": b_ref.title,
                "url": b_ref.url,
                "fileName": b_ref.file_name,
                "totalPages": real_pages,                 # REAL probed count (None => resolved at fetch). No more fabricated 380.
                "pagesResolved": real_pages is not None,
                "bookType": "core",
                "grade": (meta.get("grade") if isinstance(meta, dict) else None),  # OpenStax has no grade/term/year — honest null, not fabricated
                "term": None,
                "year": None,
                "language": b_ref.language or "en",
                "subject": subject_name,
                "subjectId": subject_id
            }
            discovered.append(book_item)
            emit("log", {"text": f"✓ {title}  → {b_ref.file_name}", "level": "ok"})
        else:
            no_pdf.append(title)

    await asyncio.gather(*(resolve(n) for n in items))
    books.sort(key=lambda b: (b.subject, b.title))
    emit("log", {
        "text": f"OpenStax: {len(books)} downloadable PDFs, {len(no_pdf)} web-only (no PDF) out of {total} nodes.",
        "level": "ok",
    })
    return books





_HREF_RE = re.compile(r'<a\s+(?:[^>]*?\s+)?href=["\']([^"\']+)["\']', re.IGNORECASE)


async def discover_generic(
    client: httpx.AsyncClient, start_url: str, max_depth: int, max_pages: int,
    emit: Emit, discovered: list[dict], job_id: str = ""
) -> list[BookRef]:
    host = urlparse(start_url).netloc
    visited: set[str] = set()
    queue: list[tuple[str, int]] = [(start_url, 1)]
    books: list[BookRef] = []
    seen_pdf: set[str] = set()
    pages = 0

    while queue and pages < max_pages:
        if job_id and check_cancel_requested(job_id):
            raise asyncio.CancelledError("Cancellation requested")
        url, depth = queue.pop(0)
        if url in visited:
            continue
        visited.add(url)
        pages += 1
        emit("progress", {"pct": min(15 + pages, 92)})
        emit("log", {"text": f"crawl p{pages} d{depth}: {url}", "level": "info"})
        try:
            if job_id and check_cancel_requested(job_id):
                raise asyncio.CancelledError("Cancellation requested")
            await asyncio.sleep(0.8)  # politeness
            r = await client.get(url, headers={"User-Agent": USER_AGENT}, timeout=15.0, follow_redirects=True)
            if r.status_code != 200 or "text/html" not in r.headers.get("content-type", ""):
                continue
            for raw in _HREF_RE.findall(r.text):
                if any(x in raw for x in ("${", "{", "}", "`")):
                    continue
                link = urljoin(url, raw.strip()).split("#")[0]
                if link.lower().endswith(".pdf"):
                    if link in seen_pdf:
                        continue
                    seen_pdf.add(link)
                    fn = os.path.basename(urlparse(link).path) or "document.pdf"
                    title = re.sub(r"[_\-]+", " ", fn[:-4]).strip().title()
                    b_ref = BookRef(source="generic", title=title, url=link)
                    books.append(b_ref)
                    
                    subject_name, subject_id = classify_subject_by_text(b_ref.title, b_ref.file_name, b_ref.url)
                    real_pages = await probe_pdf_page_count(client, b_ref.url)
                    book_item = {
                        "id": "disc_" + hashlib.sha1(b_ref.url.encode()).hexdigest()[:8],
                        "title": b_ref.title,
                        "titleAr": b_ref.title,
                        "url": b_ref.url,
                        "fileName": b_ref.file_name,
                        "totalPages": real_pages if real_pages is not None else "unknown/pending",
                        "pagesResolved": real_pages is not None,
                        "bookType": "core",
                        "grade": "Grade 11",
                        "term": "Term 1",
                        "year": "2026",
                        "language": "en",
                        "subject": subject_name,
                        "subjectId": subject_id
                    }
                    discovered.append(book_item)
                    emit("log", {"text": f"✨ PDF: {title}", "level": "ok"})
                elif depth < max_depth and urlparse(link).netloc == host and link not in visited:
                    queue.append((link, depth + 1))
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            emit("log", {"text": f"fetch error {url}: {exc}", "level": "warn"})

    emit("log", {"text": f"Generic: {len(books)} PDFs from {pages} pages.", "level": "ok"})
    return books


async def validate_books(
    client: httpx.AsyncClient, books: list[BookRef], cap: int, emit: Emit, discovered: list[dict], job_id: str = ""
) -> None:
    targets = books[:cap]
    emit("log", {"text": f"Validating {len(targets)} PDF paths (HEAD)...", "level": "info"})
    sem = asyncio.Semaphore(12)
    done = 0

    async def head(b: BookRef) -> None:
        nonlocal done
        if job_id and check_cancel_requested(job_id):
            raise asyncio.CancelledError("Cancellation requested")
        async with sem:
            try:
                if job_id and check_cancel_requested(job_id):
                    raise asyncio.CancelledError("Cancellation requested")
                r = await client.head(b.url, headers={"User-Agent": USER_AGENT}, timeout=20.0, follow_redirects=True)
                b.http_status = r.status_code
                cl = r.headers.get("content-length")
                if cl and cl.isdigit():
                    b.size_bytes = int(cl)
            except asyncio.CancelledError:
                raise
            except Exception:
                b.http_status = -1
        done += 1
        emit("progress", {"pct": 92 + int(done / max(len(targets), 1) * 7)})

    await asyncio.gather(*(head(b) for b in targets))


# --------------------------------------------------------------------------- #
# Main Execution Routine
# --------------------------------------------------------------------------- #
async def crawl_and_explore(job_id: str, target_url: str, requester_email: str) -> None:
    logs = []
    discovered = []
    
    logs.append(f"[INIT] 🚀 Starting async Cloud Run Harvester Job ID: {job_id}")
    logs.append(f"[INIT] 🕸️ Crawler targeting: {target_url} (Real dynamic catalog adapters active)")
    logs.append(f"[INIT] 📧 Triggered by administrator: {requester_email}")
    update_job_db(job_id, target_url, "harvesting", 5, logs, discovered)

    progress_pct = 5

    def emit(kind: str, payload: dict) -> None:
        nonlocal progress_pct
        if job_id and check_cancel_requested(job_id):
            raise asyncio.CancelledError("Cancellation requested")
        if kind == "log":
            prefix = "[CRAWL]" if payload["level"] == "info" else "[OK]" if payload["level"] == "ok" else "[WARNING]"
            logs.append(f"[{time.strftime('%H:%M:%S')}] {prefix} {payload['text']}")
            print(f"  [{payload['level']}] {payload['text']}", flush=True)
            update_job_db(job_id, target_url, "harvesting", progress_pct, logs, discovered)
        elif kind == "progress":
            progress_pct = payload["pct"]
            update_job_db(job_id, target_url, "harvesting", progress_pct, logs, discovered)

    if "openstax.org" in target_url:
        source = "openstax"
    else:
        source = "generic"

    timeout = httpx.Timeout(30.0, connect=15.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            if source == "openstax":
                books = await discover_openstax(client, OPENSTAX_LISTING, emit, discovered, job_id)
            else:
                books = await discover_generic(client, target_url, max_depth=3, max_pages=80, emit=emit, discovered=discovered, job_id=job_id)

            if books:
                await validate_books(client, books, cap=300, emit=emit, discovered=discovered, job_id=job_id)

        logs.append(f"[COMPLETE] ✅ Dynamic catalog spider finished! Discovered {len(discovered)} textbook documents successfully mapped.")
        update_job_db(job_id, target_url, "completed", 100, logs, discovered)
    except asyncio.CancelledError:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [CRAWL] 🛑 Crawl job cancelled cooperatively.")
        update_job_db(job_id, target_url, "killed", progress_pct, logs, discovered)
        print(f"[{time.strftime('%H:%M:%S')}] [CRAWL] Crawl job cancelled cooperatively.", flush=True)


def main():
    try:
        payload = json.loads(sys.stdin.read())
    except Exception as e:
        print(f"Error parsing input JSON: {e}", file=sys.stderr)
        sys.exit(1)

    job_id = payload.get("jobId")
    target_url = payload.get("url")
    requester_email = payload.get("requesterEmail", "anonymous@fahem.edu")

    if not job_id or not target_url:
        print("Missing required parameters jobId or url", file=sys.stderr)
        sys.exit(1)

    asyncio.run(crawl_and_explore(job_id, target_url, requester_email))
    sys.exit(0)


if __name__ == "__main__":
    main()
