import urllib.request
import json

url = "https://fahem--fahem-88d40.us-east4.hosted.app/api/books/pages?bookId=book_introduction_to_python_programming_1780627757426"

try:
    print("Fetching URL:", url)
    with urllib.request.urlopen(url) as response:
        html = response.read().decode('utf-8')
        data = json.loads(html)
        print("Success in response:", data.get("success"))
        pages = data.get("pages", [])
        print("Number of pages:", len(pages))
        if pages:
            first_page = pages[0]
            print("\nFirst Page Dictionary Keys:", list(first_page.keys()))
            print("First Page Details:")
            for k, v in first_page.items():
                if k != "content":
                    print(f"  {k}: {v}")
                else:
                    print(f"  {k} (length): {len(v)}")
except Exception as e:
    print("Error:", e)


