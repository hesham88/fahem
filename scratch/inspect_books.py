import json

def main():
    with open('web/src/app/api/local_db.json', 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    books = db.get('books', [])
    print(f"Total books in local_db.json: {len(books)}")
    for b in books:
        bid = b.get('_id') or b.get('id')
        title = b.get('title') or b.get('titleEn') or b.get('name')
        chapters_count = len(b.get('chapters', []))
        print(f"Book ID: {bid}")
        print(f"  Title: {title}")
        print(f"  Chapters Count: {chapters_count}")
        if chapters_count > 0:
            first_ch = b.get('chapters')[0]
            print(f"  First Chapter: {first_ch.get('title') or first_ch.get('titleEn')} (page range: {first_ch.get('start_page') or first_ch.get('startPage')} to {first_ch.get('end_page') or first_ch.get('endPage')})")
            print(f"  First Chapter keys: {list(first_ch.keys())}")
        print("-" * 50)

if __name__ == "__main__":
    main()
