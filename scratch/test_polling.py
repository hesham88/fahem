import sys
import os
import json
import time
import urllib.request
import urllib.error

# Ensure we can import or use parts from reexec_dbox.py
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "scripts"))
from reexec_dbox import enter_demo, _req

def main():
    tok, err = enter_demo("student")
    if not tok:
        print(f"Failed to enter student: {err}")
        return

    # Post a new book
    body = {
        "subject_id": "subj_user_uploads",
        "title": f"Trigger-Test-Scratch-{int(time.time())}",
        "title_ar": "كتاب اختبار التفعيل",
        "source_url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        "sizeBytes": 1000
    }
    
    print("Posting new book...")
    st, resp = _req("/api/books", "POST", body, token=tok, timeout=60)
    print(f"POST status: {st}")
    print(f"POST response: {resp}")
    
    if st != 200:
        return
        
    try:
        data = json.loads(resp)
        book = data.get("book") or {}
        book_id = book.get("_id") or book.get("id")
        if not book_id:
            print("No book_id found!")
            return
        
        print(f"Created Book ID: {book_id}")
        
        # Poll and print responses
        for i in range(10):
            st_g, resp_g = _req(f"/api/books?bookId={book_id}", "GET", token=tok)
            print(f"Poll {i}: GET status: {st_g}")
            print(f"Poll {i}: GET response: {resp_g}")
            time.sleep(3)
            
        # Clean up
        print("Cleaning up / cancelling...")
        st_c, resp_c = _req(f"/api/books/cancel?bookId={book_id}", "POST", token=tok)
        print(f"Cancel status: {st_c}, response: {resp_c}")
    except Exception as e:
        print(f"Error during polling: {e}")

if __name__ == "__main__":
    main()
