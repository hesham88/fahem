import urllib.request
import json
import socket
import sys

# Monkeypatch socket.getaddrinfo to bypass slow DNS lookup in local CLI sandbox
_original_getaddrinfo = socket.getaddrinfo
def _patched_getaddrinfo(host, port, *args, **kwargs):
    if host == "fahem.pro":
        return _original_getaddrinfo("35.219.200.193", port, *args, **kwargs)
    if host == "fahem-agent-1061555578804.us-east4.run.app":
        return _original_getaddrinfo("34.143.79.2", port, *args, **kwargs)
    return _original_getaddrinfo(host, port, *args, **kwargs)
socket.getaddrinfo = _patched_getaddrinfo

def get_url(url):
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.read().decode("utf-8")
    except Exception as e:
        return f"Error: {e}"

lines = []
lines.append("Fetching db-metadata from fahem-agent...")
metadata_str = get_url("https://fahem-agent-1061555578804.us-east4.run.app/db-metadata")
try:
    metadata = json.loads(metadata_str)
    lines.append("Database metadata keys:")
    lines.append(str(list(metadata.keys())))
    for k, v in metadata.items():
        if isinstance(v, dict):
            lines.append(f"  - {k}: {list(v.keys())}")
        else:
            lines.append(f"  - {k}: {v}")
except Exception as e:
    lines.append(f"Failed to parse metadata: {e}")
    lines.append(metadata_str[:500])

lines.append("\nFetching user/books from fahem-agent...")
books_str = get_url("https://fahem-agent-1061555578804.us-east4.run.app/user/books")
try:
    books_data = json.loads(books_str)
    books = books_data.get("books", [])
    lines.append(f"Total books from /user/books: {len(books)}")
    for b in books:
        lines.append(f"  - ID: {b.get('_id') or b.get('id')}, Title: {b.get('title')}, Subject ID: {b.get('subject_id')}, Curriculum ID: {b.get('curriculum_id')}")
except Exception as e:
    lines.append(f"Failed to parse books: {e}")
    lines.append(books_str[:500])

with open("C:/Users/hesh1/Desktop/fahem/scratch/query_api_output.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print("Done writing to scratch/query_api_output.txt")
