import os
import json
import urllib.request

LOCAL_DB_PATH = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"
AGENT_URL = "https://fahem-agent-sbqsl5tfga-uk.a.run.app/user/books"
BYPASS_TOKEN = "Bearer LOCAL_BYPASS_TOKEN_fahem_2026"

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
    
    # 2. Fetch full detail for each book
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

    if not fetched_books:
        print("[SYNC] No books successfully fetched from production. Aborting merge.")
        return

    # 3. Read local db
    if os.path.exists(LOCAL_DB_PATH):
        with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
            local_db = json.load(f)
    else:
        local_db = {"subjects": [], "books": []}

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

    # 5. Write back to local_db.json
    with open(LOCAL_DB_PATH, "w", encoding="utf-8") as f:
        json.dump(local_db, f, indent=2, ensure_ascii=False)
    
    print(f"[SUCCESS] Successfully updated local database. Books count is now: {len(local_db['books'])}")

if __name__ == "__main__":
    fetch_and_sync()
