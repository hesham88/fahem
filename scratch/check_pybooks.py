import json
import sys

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    with open('web/src/app/api/local_db.json', 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    books = db.get('books', [])
    print(f"Total books in local_db.json: {len(books)}")
    
    python_books = [b for b in books if 'python' in b.get('title', '').lower() or 'python' in b.get('title_ar', '').lower()]
    for b in python_books:
        bid = b.get('_id') or b.get('id')
        title = b.get('title')
        title_ar = b.get('title_ar')
        chapters = b.get('chapters', [])
        print(f"ID: {bid}")
        print(f"  Title EN: {title}")
        print(f"  Title AR: {title_ar}")
        print(f"  Chapters Count: {len(chapters)}")
        print(f"  Chapters: {chapters}")
        print("-" * 50)

if __name__ == "__main__":
    main()
