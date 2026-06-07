import httpx
import json
import sys
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

url = "https://fahem-agent-sbqsl5tfga-uk.a.run.app/user/books/pages?book_id=book_introduction_to_python_programming_1780627757426"

token = os.environ.get("FAHEM_AUTH_TOKEN", "YOUR_FAHEM_AUTH_TOKEN")

headers = {
    "Accept": "application/json",
    "Authorization": f"Bearer {token}"
}

print("Fetching from Cloud Run agent directly:", url)
try:
    res = httpx.get(url, headers=headers, timeout=15.0)
    print("Status code:", res.status_code)
    data = res.json()
    print("Success in response:", data.get("success"))
    print("Number of pages in response:", len(data.get("pages", [])))
    if "pages" in data and len(data["pages"]) > 0:
        print("First page keys:", list(data["pages"][0].keys()))
except Exception as e:
    print("Error:", e)
