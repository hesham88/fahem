import os
import sys
import json
import subprocess
import urllib.request

# Ensure stdout supports UTF-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

AGENT_URL = "https://fahem-agent-1061555578804.us-east4.run.app/user/books"

def main():
    try:
        token = subprocess.check_output(["gcloud", "auth", "print-identity-token"], shell=True).decode().strip()
    except Exception as e:
        print(f"Error getting token: {e}")
        return
        
    headers = {"Authorization": f"Bearer {token}"}
    req = urllib.request.Request(AGENT_URL, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10.0) as res:
            res_data = json.loads(res.read().decode('utf-8'))
            books_list = res_data.get("books", [])
            print(f"Total books found: {len(books_list)}")
            
            # Find and display books containing "Live Ingest" or "live_ingest"
            found_test_books = []
            for b in books_list:
                b_id = b.get("_id") or b.get("id") or ""
                b_title = b.get("title") or ""
                if "live" in b_id.lower() or "live" in b_title.lower() or "ingest" in b_id.lower() or "ingest" in b_title.lower():
                    found_test_books.append(b)
                    
            print(f"Found {len(found_test_books)} test/ingest/live books:")
            for b in sorted(found_test_books, key=lambda x: x.get("_id", ""), reverse=True):
                def safe_print(label, val):
                    try:
                        print(f"{label}: {str(val)}")
                    except Exception:
                        try:
                            clean_val = str(val).encode('ascii', errors='replace').decode('ascii')
                            print(f"{label}: {clean_val}")
                        except Exception:
                            pass
                
                safe_print("ID", b.get("_id"))
                safe_print("  Title", b.get("title"))
                safe_print("  Status", b.get("ingestion_status") or b.get("status"))
                safe_print("  Progress", b.get("ingestion_progress"))
                safe_print("  Downloaded", b.get("is_downloaded"))
                safe_print("  Indexed", b.get("is_indexed"))
                safe_print("  Vectored", b.get("is_vectored"))
                safe_print("  Embedded", b.get("is_embedded"))
                safe_print("  Completed", b.get("is_completed"))
                safe_print("  Logs count", len(b.get("ingestion_logs", [])))
                if b.get("ingestion_logs"):
                    safe_print("  Latest logs", b.get("ingestion_logs")[-3:])
                print("-" * 40)
    except Exception as e:
        print(f"Error fetching books: {e}")

if __name__ == "__main__":
    main()
