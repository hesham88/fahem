import json

def main():
    with open('web/src/app/api/local_db.json', 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    pages = db.get('book_pages', [])
    print(f"Total pages in local_db.json: {len(pages)}")
    
    python_ids = [
        "book_introduction_to_python_programming_1780850976048",
        "book_introduction_to_python_programming_1780535737559",
        "book_intro_to_python_1780730882135"
    ]
    
    for bid in python_ids:
        book_pages = [p for p in pages if p.get('book_id') == bid]
        print(f"Book ID: {bid}")
        print(f"  Pages Count: {len(book_pages)}")
        if book_pages:
            print(f"  First Page Sample: {book_pages[0].get('page_number')}")
        print("-" * 50)

if __name__ == "__main__":
    main()
