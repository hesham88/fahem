import json
import os

path = "C:/Users/hesh1/Desktop/fahem/web/src/app/api/local_db.json"
with open(path, "r", encoding="utf-8") as f:
    db = json.load(f)

books = db.get("books", [])
book_pages = db.get("book_pages", [])

# Target book: Introduction to Python Programming (4 chapters)
target_id = "book_introduction_to_python_programming_1780535737559"
target_book = next((b for b in books if b.get("_id") == target_id), None)

if not target_book:
    print("Error: Target Python book not found in books list!")
    exit(1)

# Find all other books that are Python books (duplicates)
duplicate_ids = []
for b in books:
    bid = b.get("_id") or b.get("id")
    if bid == target_id:
        continue
    title = (b.get("title", "") or "").lower()
    title_ar = (b.get("title_ar", "") or "").lower()
    if "python" in title or "python" in title_ar:
        duplicate_ids.append(bid)

print("Target Python Book:", target_book.get("title"), "(ID:", target_id, ")")
print("Duplicate Python Books found:", duplicate_ids)

# We will consolidate pages.
# 1. Keep the 9 high-fidelity pages from target_book
p9_pages = [p for p in book_pages if p.get("book_id") == target_id]
p9_page_numbers = {p.get("page_number") for p in p9_pages}
print(f"Target book has {len(p9_pages)} high-fidelity pages (page numbers: {sorted(list(p9_page_numbers))})")

# 2. Gather pages from the duplicate books (e.g. 315-set and 396-set)
dup_pages = [p for p in book_pages if p.get("book_id") in duplicate_ids]
print(f"Found {len(dup_pages)} pages from duplicate books.")

# 3. Filter out pages from dup_pages that have a page_number overlapping with p9_page_numbers
# We want to replace page numbers 1-9 with the high-fidelity ones.
reassociated_pages = []
overwritten_count = 0
for p in dup_pages:
    p_num = p.get("page_number")
    if p_num in p9_page_numbers:
        overwritten_count += 1
        continue
    # Change book_id and _id to target
    p["book_id"] = target_id
    p["_id"] = f"page_{target_id}_{p_num}"
    reassociated_pages.append(p)

print(f"Reassociating {len(reassociated_pages)} pages (overwrote/skipped {overwritten_count} overlapping pages)")

# 4. Filter book_pages to keep all other books' pages, and add our consolidated list
other_books_pages = [p for p in book_pages if p.get("book_id") != target_id and p.get("book_id") not in duplicate_ids]
print(f"Other books have {len(other_books_pages)} pages.")

# Build the final book_pages array
final_book_pages = other_books_pages + p9_pages + reassociated_pages
db["book_pages"] = final_book_pages
print(f"Final total book_pages in database: {len(final_book_pages)}")

# 5. Remove duplicate books from books array
final_books = [b for b in books if b.get("_id") not in duplicate_ids]
db["books"] = final_books

# 6. Update target_book page count fields
target_book["total_pages"] = 397
target_book["last_processed_page"] = 397
target_book["extracted_pages_count"] = 397
target_book["page_count"] = 397
target_book["totalPages"] = 397

# Save back to local_db.json
with open(path, "w", encoding="utf-8") as f:
    json.dump(db, f, indent=2, ensure_ascii=False)

print("Consolidation complete!")
