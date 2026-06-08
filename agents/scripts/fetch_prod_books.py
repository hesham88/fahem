import os
import json
import urllib.request

LOCAL_DB_PATH = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"
AGENT_URL = "https://fahem-agent-1061555578804.us-east4.run.app/user/books"
PAGES_URL = "https://fahem-agent-1061555578804.us-east4.run.app/user/books/pages"
BYPASS_TOKEN = f"Bearer {os.environ.get('FAHEM_AUTH_TOKEN', 'YOUR_FAHEM_AUTH_TOKEN')}"


def fetch_and_sync():
    print("[SYNC] Fetching books from production...")
    headers = {"Authorization": BYPASS_TOKEN}
    
    # 1. Fetch book list
    req = urllib.request.Request(AGENT_URL, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10.0) as res:
            res_data = json.loads(res.read().decode('utf-8'))
            books_list = res_data.get("books", [])
            print(f"[SYNC] Found {len(books_list)} books on production.")
    except Exception as e:
        print(f"[ERROR] Failed to fetch book list: {e}")
        return

    fetched_books = []
    fetched_pages_map = {}
    
    # 2. Fetch full detail for each book and its pages
    for b in books_list:
        b_id = b.get("_id") or b.get("id")
        if not b_id:
            continue
        print(f"[SYNC] Fetching details for book ID: {b_id}")
        detail_url = f"{AGENT_URL}?book_id={b_id}"
        detail_req = urllib.request.Request(detail_url, headers=headers)
        try:
            with urllib.request.urlopen(detail_req, timeout=10.0) as d_res:
                d_data = json.loads(d_res.read().decode('utf-8'))
                matched_books = d_data.get("books", [])
                
                # Find the one that matches b_id
                target_book = None
                for mb in matched_books:
                    if mb.get("_id") == b_id or mb.get("id") == b_id:
                        target_book = mb
                        break
                        
                if target_book:
                    fetched_books.append(target_book)
                    print(f"[SUCCESS] Fetched details for: {target_book.get('title')}")
                else:
                    print(f"[WARNING] No matching book found in list for ID: {b_id}")
        except Exception as e:
            print(f"[ERROR] Failed to fetch book detail for {b_id}: {e}")
            continue

        # Fetch pages for this book
        print(f"[SYNC] Fetching pages for book ID: {b_id}")
        pages_req_url = f"{PAGES_URL}?book_id={b_id}"
        pages_req = urllib.request.Request(pages_req_url, headers=headers)
        try:
            with urllib.request.urlopen(pages_req, timeout=20.0) as p_res:
                p_data = json.loads(p_res.read().decode('utf-8'))
                if p_data.get("success"):
                    book_pages = p_data.get("pages", [])
                    fetched_pages_map[b_id] = book_pages
                    print(f"[SUCCESS] Fetched {len(book_pages)} pages for book ID: {b_id}")
                else:
                    print(f"[WARNING] Failed to fetch pages for {b_id}: {p_data.get('error')}")
        except Exception as e:
            print(f"[ERROR] Failed to fetch pages for {b_id}: {e}")

    if not fetched_books:
        print("[SYNC] No books successfully fetched from production. Aborting merge.")
        return

    # 3. Read local db
    if os.path.exists(LOCAL_DB_PATH):
        with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
            local_db = json.load(f)
    else:
        local_db = {"subjects": [], "books": [], "book_pages": []}

    # 4. Merge books into local db
    existing_books = local_db.get("books", [])
    updated_books_map = {b.get("_id") or b.get("id"): b for b in existing_books}
    
    for fb in fetched_books:
        fb_id = fb.get("_id") or fb.get("id")
        # Ensure it has subject_id
        if "subject_id" not in fb or not fb["subject_id"]:
            fb["subject_id"] = "sub_computer_science_1780535716963"
        updated_books_map[fb_id] = fb
        print(f"[MERGE] Added/Updated book: {fb.get('title')} ({fb_id})")

    local_db["books"] = list(updated_books_map.values())

    # 5. Merge pages into local db
    existing_pages = local_db.get("book_pages", [])
    # We will key existing pages by a compound key: book_id + "_" + page_number
    # and update/replace them, or keep them if they are for books we didn't fetch.
    updated_pages_map = {}
    for p in existing_pages:
        p_book_id = p.get("book_id") or p.get("bookId")
        p_num = p.get("page_number") or p.get("pageNum")
        if p_book_id and p_num:
            updated_pages_map[f"{p_book_id}_{p_num}"] = p

    # Insert fetched pages
    for b_id, pages_list in fetched_pages_map.items():
        for p in pages_list:
            p_num = p.get("page_number") or p.get("pageNum")
            if p_num:
                # Normalize key names if needed to match what local expects
                p["book_id"] = b_id
                updated_pages_map[f"{b_id}_{p_num}"] = p

    local_db["book_pages"] = list(updated_pages_map.values())
    print(f"[MERGE] Total pages in database is now: {len(local_db['book_pages'])}")

    # 6. Write back to local_db.json
    with open(LOCAL_DB_PATH, "w", encoding="utf-8") as f:
        json.dump(local_db, f, indent=2, ensure_ascii=False)
    
    print(f"[SUCCESS] Successfully updated local database. Books count is: {len(local_db['books'])}, Pages count: {len(local_db['book_pages'])}")


if __name__ == "__main__":
    fetch_and_sync()

