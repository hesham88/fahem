import os
import json
import urllib.request
import urllib.error
import subprocess

LOCAL_DB_PATH = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"
BACKEND_URL = "https://fahem-agent-1061555578804.us-east4.run.app"
DUMP_PATH = r"C:\Users\hesh1\Desktop\fahem\temp\prod_dump.json"

def get_oidc_token():
    print("[SYNC] Fetching OIDC Identity Token using gcloud...")
    try:
        token = subprocess.check_output(["gcloud", "auth", "print-identity-token"], shell=True).decode().strip()
        print(f"[SYNC] Successfully retrieved OIDC token.")
        return token
    except Exception as e:
        print(f"[SYNC][-] Error retrieving OIDC token: {e}")
        return None

def fetch_endpoint(endpoint, token):
    url = f"{BACKEND_URL}{endpoint}"
    headers = {"Authorization": f"Bearer {token}"}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15.0) as res:
            return json.loads(res.read().decode('utf-8'))
    except Exception as e:
        print(f"[ERROR] Failed to fetch {endpoint}: {e}")
        return None

def main():
    token = os.environ.get('FAHEM_AUTH_TOKEN')
    if not token:
        token = get_oidc_token()
    if not token:
        print("[ERROR] No token available.")
        return

    print("Fetching libraries...")
    libs = fetch_endpoint("/user/libraries", token) or {}

    print("Fetching curricula...")
    curricula = fetch_endpoint("/user/curricula", token) or {}

    print("Fetching subjects...")
    subjects = fetch_endpoint("/user/subjects", token) or {}

    print("Fetching books...")
    books = fetch_endpoint("/user/books", token) or {}

    dump_data = {
        "libraries": libs.get("libraries", []) if isinstance(libs, dict) else libs,
        "curricula": curricula.get("curricula", []) if isinstance(curricula, dict) else curricula,
        "subjects": subjects.get("subjects", []) if isinstance(subjects, dict) else subjects,
        "books": books.get("books", []) if isinstance(books, dict) else books,
    }

    print(f"Writing dump to {DUMP_PATH}...")
    with open(DUMP_PATH, "w", encoding="utf-8") as f:
        json.dump(dump_data, f, indent=2, ensure_ascii=False)

    print("[SUCCESS] Dump complete.")
    print(f"  - Libraries count: {len(dump_data['libraries'])}")
    print(f"  - Curricula count: {len(dump_data['curricula'])}")
    print(f"  - Subjects count:  {len(dump_data['subjects'])}")
    print(f"  - Books count:     {len(dump_data['books'])}")

if __name__ == '__main__':
    main()
