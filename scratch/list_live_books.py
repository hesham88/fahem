import sys
import os
import json

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "scripts"))
from reexec_dbox import enter_demo, _get, _flatten_books

def main():
    tok, err = enter_demo("student")
    if not tok:
        print(f"Failed to enter student: {err}")
        return

    # List all books
    try:
        data = json.loads(_get("/api/books", tok))
        books = _flatten_books(data)
        print(f"Total books found: {len(books)}")
        for b in books[:15]:
            print(f"Book ID: {b.get('_id') or b.get('id')}")
            print(f"  Title: {b.get('title')}")
            print(f"  Status: {b.get('ingestion_status') or b.get('status')}")
            print(f"  Progress: {b.get('ingestion_progress')}")
            print(f"  Is Completed: {b.get('is_completed')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
