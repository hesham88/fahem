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
            
            for b in books_list:
                b_id = b.get("_id") or b.get("id") or ""
                b_title = b.get("title") or ""
                b_status = b.get("ingestion_status") or b.get("status") or ""
                is_embedded = b.get("is_embedded", False)
                
                # Check if embedded or status is embedded/completed
                if is_embedded or b_status in ["embedded", "completed", "published"]:
                    print(f"ID: {b_id} | Title: {b_title}")
                    print(f"  Status: {b_status} | Progress: {b.get('ingestion_progress')}%")
                    print(f"  is_downloaded: {b.get('is_downloaded')} | is_indexed: {b.get('is_indexed')} | is_vectored: {b.get('is_vectored')} | is_embedded: {b.get('is_embedded')} | is_completed: {b.get('is_completed')}")
                    print("-" * 50)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
