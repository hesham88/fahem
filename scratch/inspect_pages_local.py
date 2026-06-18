import json

def main():
    with open('web/src/app/api/local_db.json', 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    target_id = "book_introduction_to_python_programming_1780535737559"
    pages = db.get("book_pages", [])
    book_pages = [p for p in pages if (p.get("book_id") or p.get("bookId")) == target_id]
    print(f"Total pages in local db with ID '{target_id}': {len(book_pages)}")
    
    # print some sample pages
    sample_nums = [1, 6, 7, 11, 17, 18, 50]
    for num in sample_nums:
        for p in book_pages:
            pNum = int(p.get("page_number") or p.get("pageNum") or 0)
            if pNum == num:
                print(f"Page {num}:")
                for k in ["_id", "pageNum", "page_number", "titleEn", "chapterTitleEn", "pageTopicEn", "topic_title"]:
                    if k in p:
                        print(f"  {k}: {p[k]}")
                print()
                break

if __name__ == "__main__":
    main()
