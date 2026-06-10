import os
import sys
import json
import time
import subprocess
import urllib.request
import urllib.parse

# Ensure stdout supports UTF-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

AGENT_URL = "https://fahem-agent-1061555578804.us-east4.run.app/user/books"

def get_oidc_token():
    print("[GET-TOKEN] Fetching OIDC Identity Token using gcloud...")
    try:
        token = subprocess.check_output(["gcloud", "auth", "print-identity-token"], shell=True).decode().strip()
        print(f"[GET-TOKEN] Successfully retrieved token (length: {len(token)}).")
        return token
    except Exception as e:
        print(f"[GET-TOKEN] Error retrieving OIDC token: {e}")
        return None

def trigger_ingest(token, source_url):
    timestamp = int(time.time())
    title = f"College Physics {timestamp}"
    title_ar = f"الفيزياء الكلية {timestamp}"
    
    payload = {
        "subject_id": "subj_biology", # Physics & Chemistry
        "title": title,
        "title_ar": title_ar,
        "source_url": source_url,
        "needs_approval": False
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    req_data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(AGENT_URL, data=req_data, headers=headers, method="POST")
    
    print(f"[TRIGGER] Sending POST request to trigger ingestion...")
    print(f"[TRIGGER] Title: {title}")
    print(f"[TRIGGER] Source URL: {source_url}")
    
    try:
        with urllib.request.urlopen(req, timeout=30.0) as res:
            res_data = json.loads(res.read().decode('utf-8'))
            if res_data.get("success"):
                book = res_data.get("book", {})
                book_id = book.get("_id") or book.get("id")
                print(f"[TRIGGER] Success! Registered book ID: {book_id}")
                return book_id
            else:
                print(f"[TRIGGER] API returned failure: {res_data}")
                sys.exit(1)
    except Exception as e:
        print(f"[TRIGGER] POST request failed: {e}")
        if hasattr(e, "read"):
            try:
                err_body = e.read().decode('utf-8')
                print(f"[TRIGGER] Error body: {err_body}")
            except Exception:
                pass
        sys.exit(1)

def poll_ingestion(token, book_id):
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }
    
    print(f"\n[POLL] Start polling inline progress for book: {book_id}")
    start_time = time.time()
    last_printed_logs_len = 0
    
    # 15 minutes timeout (since College Physics is a large book and might take time)
    timeout_seconds = 900 
    
    while time.time() - start_time < timeout_seconds:
        elapsed = int(time.time() - start_time)
        
        # Call GET endpoint
        req = urllib.request.Request(AGENT_URL, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=15.0) as res:
                res_data = json.loads(res.read().decode('utf-8'))
                books = res_data.get("books", [])
                
                # Find our target book
                target_book = None
                for b in books:
                    if b.get("_id") == book_id or b.get("id") == book_id:
                        target_book = b
                        break
                
                if not target_book:
                    print(f"[{elapsed}s] Book not found in the list yet.")
                    time.sleep(10)
                    continue
                
                status = target_book.get("ingestion_status") or target_book.get("status")
                progress = target_book.get("ingestion_progress", 0)
                is_downloaded = target_book.get("is_downloaded", False)
                is_indexed = target_book.get("is_indexed", False)
                is_vectored = target_book.get("is_vectored", False)
                is_embedded = target_book.get("is_embedded", False)
                is_completed = target_book.get("is_completed", False)
                
                logs = target_book.get("ingestion_logs", [])
                
                # Safe print helper to handle Windows charmap limitations gracefully
                def safe_print(text_line):
                    try:
                        print(text_line)
                    except Exception:
                        try:
                            # Fallback: encode to ascii with replacement
                            clean = text_line.encode('ascii', errors='replace').decode('ascii')
                            print(clean)
                        except Exception:
                            pass
                
                safe_print(f"[{elapsed}s] Status: {status} | Progress: {progress}% | DLD: {is_downloaded} | IDX: {is_indexed} | VEC: {is_vectored} | EMB: {is_embedded} | CMP: {is_completed}")
                
                # Print any new log lines
                if len(logs) > last_printed_logs_len:
                    for log_line in logs[last_printed_logs_len:]:
                        safe_print(f"   >>> {log_line}")
                    last_printed_logs_len = len(logs)
                
                # Check target condition: either is_embedded is True or status is "embedded" (or "completed")
                if is_embedded or status == "embedded" or status == "completed" or is_completed:
                    print(f"\n[POLL] SUCCESS! Book reached 'embedded' state successfully in {elapsed}s.")
                    return True
                
                if status == "failed" or status == "error":
                    print(f"\n[POLL] Ingestion FAILED: {status}")
                    sys.exit(1)
                    
        except Exception as e:
            print(f"[{elapsed}s] Error polling API: {e}")
            
        time.sleep(15)
        
    print(f"\n[POLL] TIMEOUT: Ingestion stalled after {timeout_seconds}s.")
    sys.exit(1)

def main():
    source_url = "https://assets.openstax.org/oscms-prodcms/media/documents/Physics-WEB_Sab7RrQ.pdf"
    if len(sys.argv) > 1:
        source_url = sys.argv[1]
        
    token = get_oidc_token()
    if not token:
        print("[ERROR] Failed to obtain OIDC token. Ensure gcloud is authenticated.")
        sys.exit(1)
        
    book_id = trigger_ingest(token, source_url)
    poll_ingestion(token, book_id)

if __name__ == "__main__":
    main()
