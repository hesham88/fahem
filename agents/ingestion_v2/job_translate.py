#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Job 3: Translate Job for Ingestion Pipeline v2.
Reads structured pages from the database. For each page, strips non-translatable blocks,
requests gemini-3.1-flash-lite to translate translatable fields (text, term, prompt, etc.),
keys translation overlay objects by original block IDs under "i18n", saves the pages,
and spawns Stage 4 (Assemble).
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
import threading
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed

from utils import (
    update_job_status, check_cooperative_control, ROOT_DIR,
    JSON_Encoder, get_gemini_config, execute_with_retry,
    is_mongodb_enabled, get_mongodb_uri, atomic_write_json, LOCAL_DB_PATH,
    make_progress_bar, get_active_db
)
from google import genai
from google.genai import types
from schema import Translation, TranslatedBlock

db_write_lock = threading.Lock()

TRANSLATABLE_TYPES = ["paragraph", "heading", "definition", "list", "figure", "question", "callout", "example", "step"]

# Blocks whose payload must never be translated.
SKIP_TYPES = {"equation", "code", "table"}
# Only these fields carry user-visible prose.
TRANSLATABLE = ("text", "term", "items", "caption", "prompt", "options", "answer", "label", "title")


def _payload(blocks: list[dict]) -> list[dict]:
    out = []
    for b in blocks:
        if b.get("type") in SKIP_TYPES:
            continue
        item = {"id": b["id"]}
        for f in TRANSLATABLE:
            if b.get(f) is not None:
                item[f] = b[f]
        if len(item) > 1:  # has something to translate beyond the id
            out.append(item)
    return out


# FC11.1: a single page's translatable blocks used to be sent in ONE Gemini call. On a dense
# page the JSON response overflowed the model output ceiling and was truncated mid-string
# (`Invalid JSON: EOF ... column 131128`), which model_validate_json rejected deterministically
# (the 3 retries all failed at the same point), and the all-or-nothing gate then aborted the whole
# book. We now split a page's blocks into output-bounded sub-batches so no single request can
# approach the ceiling, and merge the per-batch overlays by block id (ids are unique within a page).
MAX_BATCH_CHARS = 12000   # input-char budget per request — keeps the translated output well under the ceiling
MAX_BATCH_BLOCKS = 40     # also cap block count so very small blocks don't make a huge single request
MAX_OUTPUT_TOKENS = 16384 # explicit output cap (defence in depth; each bounded batch stays well below this)


def _chunk_payload(payload, max_chars=MAX_BATCH_CHARS, max_blocks=MAX_BATCH_BLOCKS):
    """Greedily pack payload items into sub-batches bounded by serialized size and count."""
    batches, cur, cur_chars = [], [], 0
    for item in payload:
        size = len(json.dumps(item, ensure_ascii=False))
        if cur and (cur_chars + size > max_chars or len(cur) >= max_blocks):
            batches.append(cur)
            cur, cur_chars = [], 0
        cur.append(item)
        cur_chars += size
    if cur:
        batches.append(cur)
    return batches


def _translate_batch(client, model, lang_name, target_lang, batch):
    """Translate one bounded sub-batch. Raises with the REAL reason on failure (no swallowing)."""
    import re
    prompt = (
        f"Translate the user-visible text of these textbook blocks into {lang_name}.\n"
        "Rules: keep each `id` exactly; translate ONLY the fields present on each block; "
        "never merge, split, drop, or reorder blocks; preserve list/option order; do not "
        "translate proper nouns or programming keywords/code identifiers.\n\n"
        f"Blocks (JSON):\n{json.dumps(batch, ensure_ascii=False)}"
    )
    resp = client.models.generate_content(
        model=model or "gemini-3.1-flash-lite",
        contents=[prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=Translation,
            temperature=0,
            max_output_tokens=MAX_OUTPUT_TOKENS,
        ),
    )
    json_text = resp.text
    if not json_text:
        raise RuntimeError("Gemini returned empty response text")

    pattern = re.compile(r'^```(?:json)?\s*(.*?)\s*```$', re.DOTALL | re.IGNORECASE)
    match = pattern.match(json_text.strip())
    json_text = match.group(1).strip() if match else json_text.strip()

    result = Translation.model_validate_json(json_text)  # raises json_invalid/schema error verbatim
    out = {}
    for tb in result.blocks:
        fields = tb.model_dump(exclude_none=True)
        fields.pop("id", None)
        if fields:
            out[tb.id] = {target_lang: fields}
    return out


def call_gemini_translation(blocks, api_key, model, target_lang):
    """
    Translate a page's blocks via the google-genai SDK, chunked into output-bounded sub-batches
    (FC11.1). Returns {"i18n": {block_id: {lang: fields}}}. Propagates a meaningful error (so the
    worker can record the REAL cause) instead of silently returning None — except a lone block that
    is itself untranslatable/oversized, which is passed through (left untranslated) so one bad block
    can't fail an otherwise-good page.
    """
    if api_key:
        client = genai.Client(api_key=api_key)
    else:
        client = genai.Client()

    payload = _payload(blocks)
    if not payload:
        return {"i18n": {}}

    lang_name = {"ar": "Arabic", "en": "English"}.get(target_lang, target_lang)

    i18n_map = {}
    for batch in _chunk_payload(payload):
        try:
            i18n_map.update(_translate_batch(client, model, lang_name, target_lang, batch))
        except Exception as e:
            if len(batch) == 1:
                # A single block that won't translate (e.g. pathologically large) — pass it through
                # untranslated rather than failing the whole page.
                print(f"[Translation] block {batch[0].get('id')} left untranslated: {e}",
                      file=sys.stderr, flush=True)
                continue
            # A multi-block batch failed — surface the real reason so execute_with_retry/the worker
            # records it (chunking should normally keep batches well under the output ceiling).
            raise RuntimeError(
                f"translation batch failed ({len(batch)} blocks, lang={target_lang}): {e}"
            ) from e

    return {"i18n": i18n_map}

def load_structured_pages(book_id, is_local):
    """
    Loads all structured pages from database.
    """
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
            db = get_active_db(client)
            pages = list(db["book_pages"].find({"book_id": book_id}))
            client.close()
        except Exception:
            pass
    return sorted(pages, key=lambda p: p.get("page_number", 1))

def process_translate_page_worker(p_doc, api_key, model, default_target_lang=None):
    """
    Thread-pool worker translating a single page's blocks.
    """
    try:
        # Check if already translated/embedded (carried over from cache)
        if p_doc.get("i18n") and p_doc.get("status") in ["translated", "embedded"]:
            print(f"[Translate Worker] ⚡ Page {p_doc.get('page_number')} already translated in cache! Skipping API call.", flush=True)
            p_doc["status"] = "translated"
            return p_doc.get("page_number", 1), p_doc, None
            
        blocks = p_doc.get("blocks", [])
        
        # Determine target language
        target_lang = default_target_lang
        if not target_lang:
            target_lang = "en" if p_doc.get("dir") == "rtl" else "ar"
            
        i18n_data = None
        err_msg = ""
        
        # Always try to call the API even if api_key is None (rely on ADC/Vertex AI in production)
        def _api_call():
            return call_gemini_translation(blocks, api_key, model, target_lang)
        try:
            i18n_data = execute_with_retry(_api_call, max_retries=3, base_delay=1.5)
        except Exception as api_err:
            err_msg = str(api_err)
            print(f"[Translate Worker Exception] {api_err}", file=sys.stderr)
            
        if not i18n_data or not isinstance(i18n_data, dict):
            raise RuntimeError(f"Gemini translation failed or returned empty for Page {p_doc.get('page_number', 1)}. Details: {err_msg}")
            
        p_doc["i18n"] = i18n_data.get("i18n", {}) if isinstance(i18n_data, dict) else {}
        p_doc["status"] = "translated"
        
        return p_doc.get("page_number", 1), p_doc, None
    except Exception as page_err:
        return p_doc.get("page_number", 1), None, str(page_err)

def main():
    try:
        payload = json.loads(sys.stdin.read())
    except Exception as e:
        print(f"Error parsing stdin JSON in Job 3: {e}", file=sys.stderr)
        sys.exit(1)

    book_id = payload.get("book_id")
    temp_pdf_path = payload.get("temp_pdf_path")
    total_pages = payload.get("total_pages", 1)
    is_local = payload.get("is_local", True)
    logs = payload.get("ingestion_logs", [])
    
    job_id = f"job_{book_id}"
    
    metadata = {
        "book_id": book_id,
        "subject_id": payload.get("subject_id"),
        "title": payload.get("title"),
        "title_ar": payload.get("title_ar"),
        "source_url": payload.get("source_url"),
        "storage_path": payload.get("storage_path"),
        "grade": payload.get("grade"),
        "term": payload.get("term"),
        "year": payload.get("year"),
        "language": payload.get("language"),
        "book_type": payload.get("book_type"),
        "userId": payload.get("userId")
    }

    t_str = time.strftime("%H:%M:%S")
    logs.append(f"[{t_str}] [TRANSLATE] Job 3: Initializing multi-threaded academic translation overlays.")
    update_job_status(job_id, "processing", "translate", 56, logs, 0, total_pages, False, is_local, **metadata)

    structured_pages = load_structured_pages(book_id, is_local)
    if not structured_pages:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [WARNING] No structured pages found in database. Synthesizing draft mock structured page.")
        structured_pages = [{
            "_id": f"page_{book_id}_1",
            "book_id": book_id,
            "page_number": 1,
            "dir": "ltr",
            "blocks": [
                {"id": "p1-b1", "parent": "", "type": "heading", "level": 1, "text": "Draft Section"},
                {"id": "p1-b2", "parent": "", "type": "paragraph", "text": "Mock overview content."}
            ],
            "status": "structured"
        }]

    actual_total_pages = len(structured_pages)
    api_key, model = get_gemini_config()
    
    if api_key:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [TRANSLATE] Gemini credentials discovered. Running automated key translation overlays.")
    else:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [TRANSLATE] Configured translator using Application Default Credentials (ADC) / Vertex AI. Model: '{model}'. Running automated key translation overlays.")

    translated_count = 0
    has_errors = False

    book_lang = payload.get("language") or ""
    default_target_lang = None
    if book_lang:
        if "ar" in book_lang.lower():
            default_target_lang = "en"
        elif "en" in book_lang.lower():
            default_target_lang = "ar"

    translate_start_time = time.time()
    failed_pages = []  # FC11.2: (source_doc, err_msg) collected for a retry pass + tolerance, not an instant abort

    def _record_translated(p_no, p_doc, flagged=False):
        nonlocal translated_count
        translated_count += 1
        pct = 56 + int((translated_count / actual_total_pages) * 20)  # Range 56% - 76%
        sub_pct = (translated_count / actual_total_pages) * 100.0
        bar = make_progress_bar(sub_pct, width=20)

        # Compute ETA
        elapsed = time.time() - translate_start_time
        avg_time = elapsed / max(translated_count, 1)
        rem_pages = actual_total_pages - translated_count
        eta_s = int(avg_time * rem_pages)
        eta_str = f"{eta_s}s" if eta_s < 60 else f"{eta_s//60}m {eta_s%60}s"

        tag = " (flagged: kept original text)" if flagged else ""
        log_msg = f"{bar} Translated Page {p_no}/{actual_total_pages} [ETA {eta_str}]{tag}."
        print(f"[JOB 3: TRANSLATE] {log_msg}", flush=True)
        logs.append(f"[{time.strftime('%H:%M:%S')}] [TRANSLATE] {log_msg}")

        # Write page back to database
        with db_write_lock:
            update_job_status(
                job_id, "processing", "translate", pct, logs,
                processed_pages=translated_count, total_pages=actual_total_pages,
                is_completed=False, is_local=is_local, new_page_doc=p_doc, **metadata
            )

    # Thread Pool execution with 3 workers
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(process_translate_page_worker, p_doc, api_key, model, default_target_lang): p_doc
            for p_doc in structured_pages
        }

        for future in as_completed(futures):
            src_doc = futures[future]
            p_num = src_doc.get("page_number", 1)
            check_cooperative_control(job_id, is_local, logs)

            p_no, p_doc, err_msg = future.result()
            if p_doc:
                _record_translated(p_no, p_doc)
            else:
                # FC11.2: collect for the retry pass instead of failing the whole book at 99.9%.
                failed_pages.append((src_doc, err_msg))
                logs.append(f"[{time.strftime('%H:%M:%S')}] [TRANSLATE_ERROR] Page {p_num} translation failed (will retry): {err_msg}")
                print(f"[JOB 3: TRANSLATE_ERROR] Page {p_num} translation failed (will retry): {err_msg}", file=sys.stderr)

    # FC11.2: final serial retry pass on ONLY the failed pages. Transient errors clear here; the
    # deterministic output-overflow that used to abort the book no longer reaches here (FC11.1 chunking).
    if failed_pages:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [TRANSLATE] ♻️ Retrying {len(failed_pages)} page(s) that failed the first pass...")
        update_job_status(job_id, "processing", "translate", 72, logs, translated_count, actual_total_pages, False, is_local, **metadata)
        still_failed = []
        for src_doc, _prev in failed_pages:
            check_cooperative_control(job_id, is_local, logs)
            p_no, p_doc, err_msg = process_translate_page_worker(src_doc, api_key, model, default_target_lang)
            if p_doc:
                _record_translated(p_no, p_doc)
            else:
                still_failed.append((src_doc, err_msg))
        failed_pages = still_failed

    # FC11.2: tolerance — proceed+flag for a small residue; hard-fail only if the failure is systemic.
    failed_count = len(failed_pages)
    tolerance = max(2, int(actual_total_pages * 0.02))  # floor of 2, else 2% of the book
    if failed_count > tolerance:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [TRANSLATE] ❌ Job 3 failed: {failed_count}/{actual_total_pages} pages unrecoverable (exceeds tolerance of {tolerance}). Likely systemic (credentials/model/quota). Downstream jobs aborted.")
        update_job_status(job_id, "failed", "translate", 56, logs, translated_count, actual_total_pages, False, is_local, **metadata)
        sys.exit(1)

    review_pages = []
    if failed_count:
        for src_doc, err_msg in failed_pages:
            # Mark translated-with-empty-i18n so downstream proceeds; the reader falls back to the
            # original-language text for these pages, and they're flagged for later review.
            src_doc["i18n"] = src_doc.get("i18n") or {}
            src_doc["status"] = "translated"
            src_doc["needs_translation_review"] = True
            src_doc["translation_review_reason"] = str(err_msg)[:300]
            review_pages.append(src_doc.get("page_number", 1))
            _record_translated(src_doc.get("page_number", 1), src_doc, flagged=True)
        review_pages = sorted(review_pages)
        logs.append(f"[{time.strftime('%H:%M:%S')}] [TRANSLATE] ⚠️ Proceeding with {failed_count} page(s) flagged needs_translation_review (readers see the original text): {review_pages}.")
        update_job_status(job_id, "processing", "translate", 76, logs, translated_count, actual_total_pages, False, is_local, needs_translation_review=review_pages, **metadata)

    done_msg = ("✅ All pages successfully translated and annotated."
                if not review_pages
                else f"✅ Translation complete — {len(review_pages)} page(s) flagged for review (original text shown).")
    logs.append(f"[{time.strftime('%H:%M:%S')}] [TRANSLATE] {done_msg} Triggering Downstream Job 4 (Assemble)...")
    update_job_status(job_id, "processing", "assemble", 76, logs, translated_count, actual_total_pages, False, is_local, **metadata)

    # Trigger Job 4 (Assemble)
    try:
        python_path = sys.executable or "python"
        SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
        assemble_script = os.path.join(SCRIPT_DIR, "job_assemble.py")
        
        payload["ingestion_logs"] = logs
        payload["temp_pdf_path"] = temp_pdf_path
        payload["total_pages"] = actual_total_pages
        
        popen_kwargs = {
            "stdin": subprocess.PIPE,
            "stdout": None,
            "stderr": None,
            "text": True,
            "close_fds": True,
            "env": dict(os.environ, PYTHONIOENCODING="utf-8")
        }
        if sys.platform == "win32":
            popen_kwargs["creationflags"] = 0x08000000  # CREATE_NO_WINDOW

        proc = subprocess.Popen(
            [python_path, assemble_script],
            **popen_kwargs
        )
        proc.stdin.write(JSON_Encoder().encode(payload))
        proc.stdin.close()
        print(f"[JOB 3: TRANSLATE] Successfully triggered Job 4 (Assemble) with PID {proc.pid}. Waiting for completion...", flush=True)
        
        ret_code = proc.wait()
        if ret_code != 0:
            print(f"[JOB 3: TRANSLATE] Downstream Job 4 (Assemble) failed with return code {ret_code}", file=sys.stderr)
            sys.exit(ret_code)
            
        print(f"[JOB 3: TRANSLATE] Downstream Job 4 (Assemble) completed successfully.", flush=True)

    except Exception as trigger_err:
        logs.append(f"[{time.strftime('%H:%M:%S')}] [CRITICAL] Failed to trigger Job 4: {trigger_err}")
        update_job_status(job_id, "failed", "translate", 76, logs, translated_count, actual_total_pages, False, is_local, **metadata)
        sys.exit(1)

if __name__ == "__main__":
    main()
