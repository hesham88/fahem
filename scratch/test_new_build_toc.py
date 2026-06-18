import json
import re

def isMainChapter(title: str) -> bool:
    if not title:
        return False
    t = title.strip().lower()
    isChPattern = re.match(r'^(chapter|chap|الفصل|باب)\s+\d+', t)
    if isChPattern:
        return True

    mainTitles = [
        "book cover", "cover", "غلاف الكتاب", "غلاف",
        "contents", "المحتويات", "الفهرس", "فهرس",
        "preface", "المقدمة", "تمهيد", "مقدمة",
        "answer key", "مفاتيح الإجابات", "حلول", "الأجوبة",
        "index", "كشاف"
    ]
    return t in mainTitles

def run_test():
    # Test local book structure
    local_chapters = [
        {"title": "Introduction to Programming & Variables", "page_start": 1, "page_end": 3},
        {"title": "Control Structures & Logic Gates", "page_start": 4, "page_end": 5},
        {"title": "Functions & Recursive Memory Stack", "page_start": 6, "page_end": 7},
        {"title": "Structured Data Models & Hashes", "page_start": 8, "page_end": 9}
    ]

    nestedChapters = []
    currentMain = None

    for idx, ch in enumerate(local_chapters):
        titleEn = ch.get('title') or f"Section {idx + 1}"
        titleAr = ch.get('title_ar') or titleEn
        start = ch.get('page_start')
        end = ch.get('page_end')

        isContained = False
        if currentMain and start is not None and end is not None:
            mainStart = currentMain.get('startPage')
            mainEnd = currentMain.get('endPage')
            if mainStart is not None and mainEnd is not None:
                isContained = (start >= mainStart and end <= mainEnd)

        isMain = isMainChapter(titleEn) or isMainChapter(titleAr) or not isContained

        if isMain or not currentMain:
            currentMain = {
                "id": f"ch-{idx}",
                "titleEn": titleEn,
                "titleAr": titleAr,
                "pageNum": start or 1,
                "startPage": start,
                "endPage": end,
                "topics": []
            }
            nestedChapters.append(currentMain)
        else:
            currentMain["topics"].append({
                "id": f"top-{idx}",
                "titleEn": titleEn,
                "titleAr": titleAr,
                "pageNum": start or currentMain["pageNum"]
            })

    print("Local Book nested chapters output:")
    for ch in nestedChapters:
        print(f"Main Chapter: {ch['titleEn']} (pageNum: {ch['pageNum']}) - start: {ch['startPage']}, end: {ch['endPage']}")
        for t in ch['topics']:
            print(f"  Topic: {t['titleEn']} (pageNum: {t['pageNum']})")

if __name__ == "__main__":
    run_test()
