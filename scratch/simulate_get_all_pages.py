import json

def main():
    # Load production book detail
    # We can load the response from task-504
    # But wait, let's just make a file with the book detail we got
    # or let's read the book we synced from local_db.json
    # Wait, openstax_python_programming has 164 chapters!
    with open('web/src/app/api/local_db.json', 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    # find openstax_python_programming
    book = None
    for b in db.get('books', []):
        if b.get('_id') == "openstax_python_programming":
            book = b
            break
            
    if not book:
        print("openstax_python_programming not found locally")
        return
        
    print(f"Loaded book: {book.get('title')} with {len(book.get('chapters', []))} chapters")
    
    # Let's mock pagesState with 397 pages for this book
    pagesState = []
    for i in range(1, 398):
        pagesState.append({
            "book_id": "openstax_python_programming",
            "page_number": i,
            "pageNum": i,
            "content": f"Page content for {i}"
        })
        
    # Simulate getAllPages
    chapters = book.get("chapters", [])
    hasDefinedChapters = len(chapters) > 0
    
    mapped_pages = []
    for p in pagesState:
        pageNum = p["page_number"]
        matchedIndex = -1
        matchedChapter = None
        
        # We need to find the correct chapter
        # Wait! The JS code does:
        # matchedIndex = book.chapters.findIndex((ch) => {
        #   const start = ch.page_start ?? ch.start_page ?? 1;
        #   const end = ch.page_end ?? ch.end_page ?? 99999;
        #   return pageNum >= start && pageNum <= end;
        # });
        # BUT wait! Some chapters have overlapping ranges.
        # Let's simulate findIndex (returns first match)
        for idx, ch in enumerate(chapters):
            start = ch.get('page_start') or ch.get('start_page') or 1
            end = ch.get('page_end') or ch.get('end_page') or 99999
            if pageNum >= start and pageNum <= end:
                matchedIndex = idx
                matchedChapter = ch
                break
                
        fallbackChapterTitleEn = matchedChapter["title"] if matchedChapter else f"Section {pageNum}"
        
        mapped_pages.append({
            "pageNum": pageNum,
            "chapterTitleEn": p.get('chapterTitleEn') or fallbackChapterTitleEn,
            "chapterIndex": matchedIndex
        })
        
    # Now group by chapterTitleEn just like buildTOC fallback does
    chaptersMap = {}
    originalChapterOrder = []
    for ch in chapters:
        titleEn = ch.get('title') or "Chapter"
        chaptersMap[titleEn] = {
            "titleEn": titleEn,
            "pages": []
        }
        originalChapterOrder.append(titleEn)
        
    for p in mapped_pages:
        chTitleEn = p["chapterTitleEn"]
        if chTitleEn not in chaptersMap:
            chaptersMap[chTitleEn] = {
                "titleEn": chTitleEn,
                "pages": []
            }
        chaptersMap[chTitleEn]["pages"].append(p)
        
    # Print chapters and their pages
    print("\nGenerated Chapters:")
    for chTitleEn in originalChapterOrder:
        ch_info = chaptersMap[chTitleEn]
        pages_in_ch = [p["pageNum"] for p in ch_info["pages"]]
        if len(pages_in_ch) > 0:
            print(f"Chapter '{chTitleEn}' (order index {originalChapterOrder.index(chTitleEn)}): pages: {pages_in_ch[:10]} ... ({len(pages_in_ch)} pages total)")
            
    print("\nNon-original chapters (fallback sections):")
    for key, val in chaptersMap.items():
        if key not in originalChapterOrder:
            pages_in_ch = [p["pageNum"] for p in val["pages"]]
            print(f"Chapter '{key}': pages: {pages_in_ch[:15]} ... ({len(pages_in_ch)} pages total)")

if __name__ == "__main__":
    main()
