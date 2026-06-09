#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
reexec_dbox.py — INDEPENDENT live re-execution of the demo-critical D-boxes.

The guard re-runs the REAL check against live fahem.pro itself; it does NOT trust
builder-emitted assertions or vision verdicts. Called by guard_done for
d_box in {D5, D6, D7} (the endgame lock — a fact you can't author).

  D5  agent reads books   → enter the public demo, ask the agent a grounded question,
                            assert a REAL [pN] citation comes back (not a deflection).
  D6  ingestion→embedded  → same grounding signal: a [pN] citation means vector search
                            returned a real embedded page (embeddings exist + index works).
  D7  per-book content     → list books, assert chapters are PER-BOOK, not one shared
                            "Chapter 1: Statements & Programming" (the Python contamination).

Exit 0 = independently verified PASS. Exit 1 = FAIL / could-not-verify (= not proven).
Override base with env FAHEM_BASE (default https://fahem.pro).
"""

import sys
import os
import json
import re
import time
import base64
import urllib.request
import urllib.error

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE = os.environ.get("FAHEM_BASE", "https://fahem.pro").rstrip("/")
PYBOOK = re.compile(r"statements?\s*(&|and)\s*programming", re.I)
CITE = re.compile(r"\[p\s*\d+\]", re.I)
DEFLECT = re.compile(r"which book|don'?t have|do not have|no book|empty librar|0 books|cannot find|i first need to know", re.I)


def _headers(token=None):
    h = {"User-Agent": "Fahem-ReExec", "Content-Type": "application/json"}
    if token:
        h["Authorization"] = "Bearer " + token
    return h


def _post(path, payload, token=None, timeout=90, stream=False):
    req = urllib.request.Request(BASE + path, data=json.dumps(payload).encode("utf-8"),
                                 headers=_headers(token), method="POST")
    resp = urllib.request.urlopen(req, timeout=timeout)
    return resp if stream else json.loads(resp.read().decode("utf-8", "ignore"))


def _get(path, token=None, timeout=40):
    req = urllib.request.Request(BASE + path, headers=_headers(token), method="GET")
    return urllib.request.urlopen(req, timeout=timeout).read().decode("utf-8", "ignore")


def _req(path, method="GET", payload=None, token=None, timeout=40):
    """Status-aware request: returns (status_code|None, body_text)."""
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(BASE + path, data=data, headers=_headers(token), method=method)
    try:
        r = urllib.request.urlopen(req, timeout=timeout)
        return r.getcode(), r.read().decode("utf-8", "ignore")
    except urllib.error.HTTPError as e:
        try:
            return e.code, e.read().decode("utf-8", "ignore")
        except Exception:
            return e.code, ""
    except Exception as e:
        return None, str(e)


def decode_demo_token(token):
    """Demo token = demo-token:<b64 header>.<b64 body>.<sig>; body holds db_target/uid/session."""
    if not token or not token.startswith("demo-token:"):
        return {}
    parts = token[len("demo-token:"):].split(".")
    if len(parts) < 2:
        return {}
    body = parts[1] + "=" * (-len(parts[1]) % 4)
    for dec in (base64.b64decode, base64.urlsafe_b64decode):
        try:
            return json.loads(dec(body).decode("utf-8", "ignore"))
        except Exception:
            continue
    return {}


def enter_demo(persona="student"):
    try:
        d = _post("/api/demo/enter", {"persona": persona}, timeout=30)
        tok = d.get("token")
        return (tok, "") if tok else (None, "demo/enter returned no token")
    except Exception as e:
        return None, f"demo/enter failed: {e}"


def _is_book(d):
    return isinstance(d, dict) and (d.get("title") or d.get("title_ar")) and \
        ("chapters" in d or "book_type" in d or "subject_id" in d or "library_id" in d)


def _flatten_books(data):
    # /api/knowledge returns SUBJECTS with nested core_books/supporting_books/books arrays.
    subs = []
    if isinstance(data, list):
        subs = data
    elif isinstance(data, dict):
        for k in ("subjects", "data", "results", "items", "books"):
            if isinstance(data.get(k), list):
                subs = data[k]
                break
        if not subs:
            for v in data.values():
                if isinstance(v, list) and v and isinstance(v[0], dict):
                    subs = v
                    break
    books, seen = [], set()

    def _add(b):
        bid = book_id_of(b)
        if _is_book(b) and bid not in seen:
            seen.add(bid)
            books.append(b)

    for s in subs:
        if not isinstance(s, dict):
            continue
        nested = False
        for k in ("core_books", "supporting_books", "books"):
            arr = s.get(k)
            if isinstance(arr, list):
                for b in arr:
                    _add(b)
                    nested = nested or _is_book(b)
        if not nested:
            _add(s)  # the item itself may already be a book
    return books


def get_books(token):
    for path in ("/api/knowledge", "/api/books"):
        try:
            data = json.loads(_get(path, token))
        except Exception:
            continue
        books = _flatten_books(data)
        if books:
            return books
    return []


def book_id_of(b):
    return b.get("_id") or b.get("id") or b.get("book_id")


def ask_agent(token, prompt, book_ids):
    try:
        resp = _post("/api/agent", {"prompt": prompt, "language": "en", "selected_book_ids": book_ids},
                     token=token, timeout=120, stream=True)
    except Exception as e:
        return "", f"agent call failed: {e}"
    chunks, start = [], time.time()
    try:
        for line in resp:
            if time.time() - start > 110:
                break
            chunks.append(line.decode("utf-8", "ignore"))
    except Exception:
        pass
    return "".join(chunks), ""


def verify_d5_d6(box):
    tok, err = enter_demo()
    if not tok:
        return False, err
    books = get_books(tok)
    if not books:
        return False, "the agent's demo session sees NO books (empty library) — D5/D6 not real"
    target = next((b for b in books if "python" not in (b.get("title", "").lower())), books[0])
    bid = book_id_of(target)
    prompt = f"Using the book '{target.get('title')}', state one key idea and cite the exact page as [pN]."
    text, aerr = ask_agent(tok, prompt, [bid] if bid else [])
    if aerr:
        return False, aerr
    if CITE.search(text):
        return True, f"agent returned a REAL page citation {CITE.search(text).group(0)} grounded in '{target.get('title')}'"
    if DEFLECT.search(text.lower()):
        return False, f"agent deflected (no grounding): /{DEFLECT.search(text.lower()).group(0)}/ — {box} not real"
    return False, f"agent answer contained NO [pN] citation — {box} grounding not proven"


def verify_d7():
    tok, err = enter_demo()
    if not tok:
        return False, err
    books = get_books(tok)
    if not books:
        return False, "no books returned to check chapter structure (D7)"
    titles = []
    nonpy_ok = False
    for b in books:
        chs = b.get("chapters") or []
        t0 = (chs[0].get("title") if chs and isinstance(chs[0], dict) else "") or ""
        titles.append(t0.strip().lower())
        is_py = "python" in (b.get("title", "").lower())
        if not is_py and PYBOOK.search(t0):
            return False, f"book '{b.get('title')}' shows the Python chapter '{t0}' — D7 contamination STILL live"
        if not is_py and t0 and not PYBOOK.search(t0):
            nonpy_ok = True
    nonempty = [t for t in titles if t]
    if not nonempty:
        return False, "no chapter titles present in the books payload — D7 unverifiable (chapters missing)"
    if len(nonempty) > 1 and len(set(nonempty)) == 1:
        return False, f"every book shows the SAME first chapter '{nonempty[0]}' — D7 contamination"
    if not nonpy_ok:
        return False, "no non-Python book with its own real chapter title found — D7 not proven"
    return True, "books show distinct, per-book chapter titles (no Python contamination)"


def verify_d2():
    # Isolation: the demo token must route to fahem_sandbox, never prod 'fahem'.
    tok, err = enter_demo("student")
    if not tok:
        return False, err
    dbt = decode_demo_token(tok).get("db_target")
    if dbt == "fahem_sandbox":
        return True, "demo token routes db_target=fahem_sandbox (production 'fahem' is isolated)"
    return False, f"demo token db_target='{dbt}' (expected fahem_sandbox) — sandbox is NOT isolated from prod"


def verify_d3():
    # Sandbox personas: the admin persona must have admin rights (no 'Access Denied').
    tok, err = enter_demo("admin")
    if not tok:
        return False, err
    st, body = _req("/api/admin/check", token=tok)
    if st != 200:
        return False, f"/api/admin/check returned {st} for the demo admin persona — 'Access Denied' in sandbox (D3 fail)"
    try:
        d = json.loads(body)
    except Exception:
        d = {}
    if not d.get("isAdmin"):
        return False, f"demo admin persona resolved isAdmin=false (role={d.get('role')}) — admin not granted in sandbox"
    return True, f"demo admin persona has admin rights in sandbox (role={d.get('role')})"


def verify_d4():
    # Kill: an admin kill must revoke the victim session's token (next request 401).
    tokA, err = enter_demo("student")
    if not tokA:
        return False, "victim session: " + err
    sidA = decode_demo_token(tokA).get("sandbox_session_id")
    if not sidA:
        return False, "could not read sandbox_session_id from the victim token"
    tokB, err = enter_demo("admin")
    if not tokB:
        return False, "admin session: " + err
    # Let the best-effort demo-session write settle (demo/enter persists with a ~1.5s race), then retry.
    st, body = 0, ""
    for attempt in range(3):
        time.sleep(2.5)
        st, body = _req("/api/admin/demo-action", "POST", {"action": "kill", "sandbox_session_id": sidA}, token=tokB)
        if st == 200:
            break
    if st != 200:
        return False, f"kill returned {st} after retries — admin cannot kill the session: {body[:140]} (session not persisted/visible to kill — OR-32/35)"
    st2, _ = _req("/api/admin/check", token=tokA)
    if st2 == 401:
        return True, "killed session token is revoked (next request 401) — hard-boot works"
    return False, f"killed session token STILL valid (got {st2}, expected 401) — kill does not terminate the session (OR-32/35)"


def verify_d9():
    # Admin tools must load without HTTP 500 (R24/OR-37/OR-40).
    tok, err = enter_demo("admin")
    if not tok:
        return False, err
    uid = decode_demo_token(tok).get("uid", "demo_anon_x")
    st1, _ = _req("/api/admin/demo-sessions", token=tok)
    st2, _ = _req(f"/api/admin/user-token-policy?userId={uid}", token=tok)
    if st1 == 500:
        return False, "/api/admin/demo-sessions returned HTTP 500 — admin oversight tool broken (R24)"
    if st2 == 500:
        return False, "/api/admin/user-token-policy returned HTTP 500 — token-limit tool broken (R24/OR-37)"
    if st1 is None or st2 is None:
        return False, "admin tool endpoints unreachable — cannot verify D9"
    return True, f"admin tools load without 500 (demo-sessions={st1}, token-policy={st2})"


def verify_d1():
    # Sandbox entry: any visitor enters the public Tier-0 demo (no eligibility rejection — R20).
    st, body = _req("/api/demo/enter", "POST", {"persona": "student"}, timeout=30)
    if st != 200:
        return False, f"/api/demo/enter returned {st} — public sandbox entry failing (R20): {body[:140]}"
    try:
        d = json.loads(body)
    except Exception:
        d = {}
    low = body.lower()
    if "not eligible" in low or "غير مؤهل" in low or "not registered" in low:
        return False, "demo entry shows an eligibility rejection (R20)"
    if not d.get("token") or not d.get("success"):
        return False, f"demo entry returned no token/success — Tier-0 entry not working: {body[:140]}"
    return True, f"public Tier-0 sandbox entry works (token issued, persona={(d.get('session') or {}).get('persona')})"


def verify_d8():
    # Audio: the TTS endpoint must return REAL audio bytes, not a 500 / empty (R18/R28).
    tok, err = enter_demo("student")
    if not tok:
        return False, err
    books = get_books(tok)
    bid = book_id_of(books[0]) if books else None
    payload = {"text": "The Pythagorean theorem relates the sides of a right triangle.",
               "language": "en", "voice": "Kore", "bookId": bid, "pageNumber": 1}
    st, body = _req("/api/audio/tts", "POST", payload, token=tok, timeout=90)
    if st != 200:
        return False, f"/api/audio/tts returned {st} — audio generation broken (R18/R28): {body[:160]}"
    if "audio" not in body.lower():
        return False, f"TTS response carries no audio mime type: {body[:140]}"
    m = re.search(r'"([A-Za-z0-9+/=]{500,})"', body)
    if not m:
        return False, "TTS response contains no real audio payload (empty/too small)"
    return True, f"TTS returned real audio (audio/wav, {len(m.group(1))} base64 chars)"


def main():
    if len(sys.argv) < 2:
        print("Usage: python reexec_dbox.py <D1|D2|D3|D4|D5|D6|D7|D8|D9>")
        sys.exit(2)
    box = sys.argv[1].upper()
    print(f"[REEXEC] Independently re-executing {box} against {BASE} ...")
    dispatch = {
        "D1": verify_d1, "D2": verify_d2, "D3": verify_d3, "D4": verify_d4,
        "D7": verify_d7, "D8": verify_d8, "D9": verify_d9,
    }
    if box in ("D5", "D6"):
        ok, msg = verify_d5_d6(box)
    elif box in dispatch:
        ok, msg = dispatch[box]()
    else:
        print(f"[REEXEC] No independent re-executor defined for {box}.")
        sys.exit(2)
    print(f"[REEXEC][{'PASS' if ok else 'FAIL'}] {box}: {msg}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
