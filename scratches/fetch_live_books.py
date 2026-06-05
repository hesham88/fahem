import urllib.request
import json

url = "https://fahem--fahem-88d40.us-east4.hosted.app/api/books"

try:
    print("Fetching URL:", url)
    with urllib.request.urlopen(url) as response:
        html = response.read().decode('utf-8')
        data = json.loads(html)
        print("Success in response:", data.get("success"))
        books = data.get("books", [])
        print("Number of books:", len(books))
        for b in books:
            print(f"- Title: {b.get('title') or b.get('titleEn')} | ID: {b.get('_id')} | id: {b.get('id')}")
except Exception as e:
    print("Error:", e)
