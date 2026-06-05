import sys
import os
from pymongo import MongoClient

# Add agents directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../agents")))

from agents.tools import get_mongodb_uri

def main():
    uri = get_mongodb_uri()
    print("MongoDB URI resolved successfully.")
    
    client = MongoClient(uri)
    # Try to list databases to find the correct one
    db_names = client.list_database_names()
    print("Available databases:", db_names)
    
    # Choose "fahem" or the first non-system one
    db_name = "fahem"
    for name in db_names:
        if name not in ["admin", "local", "config"]:
            db_name = name
            break
            
    db = client.get_database(db_name)
    print("Using Database name:", db.name)
    print("Collections:", db.list_collection_names())
    
    # Let's search for books with name/ID python
    print("\n--- Books in Database ---")
    books = list(db.books.find({"_id": {"$regex": "python", "$options": "i"}}))
    if not books:
        books = list(db.books.find({"title": {"$regex": "python", "$options": "i"}}))
    
    for book in books:
        print("Book ID:", book.get("_id"))
        print("Book Title:", book.get("title") or book.get("titleEn"))
        print("Book Subject:", book.get("subject"))
        print("Book Keys:", list(book.keys()))
        print("-" * 40)
        
    # Let's count pages for this book
    if books:
        target_book_id = books[0].get("_id")
        pages_count = db.pages.count_documents({"book_id": target_book_id})
        print(f"\nPages count for book ID '{target_book_id}': {pages_count}")
        
        # Let's view one page
        one_page = db.pages.find_one({"book_id": target_book_id})
        if one_page:
            print("\nSample page keys:", list(one_page.keys()))
            print("Sample page page_number:", one_page.get("page_number"))
            print("Sample page book_id:", one_page.get("book_id"))
            print("Sample page content length:", len(one_page.get("content", "")))
            
if __name__ == "__main__":
    main()
