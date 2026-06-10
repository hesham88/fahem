import json
import os

def main():
    db_path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"
    out_path = r"C:\Users\hesh1\Desktop\fahem\agents\python_book_seed.json"
    
    if not os.path.exists(db_path):
        print(f"Error: {db_path} not found")
        return
        
    with open(db_path, "r", encoding="utf-8") as f:
        db = json.load(f)
        
    books = db.get("books", [])
    book_pages = db.get("book_pages", [])
    
    target_book_id = "book_introduction_to_python_programming_1780535737559"
    
    book_doc = next((b for b in books if b.get("_id") == target_book_id or b.get("id") == target_book_id), None)
    if not book_doc:
        print(f"Error: Book {target_book_id} not found in local_db.json")
        return
        
    pages = [p for p in book_pages if p.get("book_id") == target_book_id]
    
    print(f"Extracted book: {book_doc.get('title')}")
    print(f"Extracted pages: {len(pages)}")
    
    data = {
        "book": book_doc,
        "pages": pages
    }
    
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        
    print(f"Saved to {out_path}")

if __name__ == "__main__":
    main()
