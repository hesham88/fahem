import json
import sys

def main():
    # Force utf-8 for stdout
    sys.stdout.reconfigure(encoding='utf-8')
    with open('web/src/app/api/local_db.json', 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    target_id = "book_introduction_to_python_programming_1780535737559"
    books = db.get("books", [])
    book = next((b for b in books if (b.get("_id") or b.get("id")) == target_id), None)
    if book:
        print(f"Book '{book.get('title')}' chapters:")
        chapters = book.get("chapters", [])
        print(f"  Chapters count: {len(chapters)}")
        for idx, ch in enumerate(chapters[:10]):
            print(f"  {idx+1}: {json.dumps(ch, ensure_ascii=False)}")
        if len(chapters) > 10:
            print("  ...")
    else:
        print(f"Book with ID {target_id} not found in local db.")

if __name__ == "__main__":
    main()
