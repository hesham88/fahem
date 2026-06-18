import json
import sys

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"
    with open(path, "r", encoding="utf-8") as f:
        db = json.load(f)
        
    for book in db.get("books", []):
        title = book.get("title", "") or book.get("title_ar", "")
        if "python" in title.lower():
            print(f"Book ID: {book.get('_id')}")
            print(f"Title: {title}")
            print(f"Subject: {book.get('subject_id')}")
            print(f"Chapters count: {len(book.get('chapters', []))}")
            for i, ch in enumerate(book.get("chapters", [])[:60]):
                print(f"  Chapter {i+1}: {ch.get('title')} | start: {ch.get('page_start')} | end: {ch.get('page_end')}")
            print("-" * 40)

if __name__ == "__main__":
    main()
