import sys
import json
import urllib.request

BASE = "https://fahem.pro"

def _headers(token=None):
    h = {"User-Agent": "Fahem-Test", "Content-Type": "application/json"}
    if token:
        h["Authorization"] = "Bearer " + token
    return h

def _post(path, payload, token=None):
    req = urllib.request.Request(BASE + path, data=json.dumps(payload).encode("utf-8"),
                                 headers=_headers(token), method="POST")
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read().decode("utf-8", "ignore"))

def _get(path, token=None):
    req = urllib.request.Request(BASE + path, headers=_headers(token), method="GET")
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")

def main():
    try:
        d = _post("/api/demo/enter", {"persona": "student"})
        tok = d.get("token")
        print("Token:", tok)
        if not tok:
            return
        
        for path in ("/api/knowledge", "/api/books"):
            try:
                res = _get(path, tok)
                data = json.loads(res)
                print(f"Path {path} returned keys: {list(data.keys()) if isinstance(data, dict) else len(data)}")
                if isinstance(data, dict) and "books" in data:
                    print(f"Found {len(data['books'])} books directly under 'books'")
                # Print titles
                from reexec_dbox import _flatten_books
                books = _flatten_books(data)
                print(f"Flattened {len(books)} books:")
                for b in books:
                    print(" -", b.get("title") or b.get("title_ar"), f"({b.get('_id') or b.get('id')})")
            except Exception as e:
                print(f"Path {path} failed: {e}")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    sys.path.append("scripts")
    main()
