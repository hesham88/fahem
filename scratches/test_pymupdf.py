import os
import sys

pdf_path = r"C:\Users\hesh1\Desktop\fahem\ignore\temp_book_introduction_to_python_programming_web_1780593796352.pdf"

try:
    import fitz # PyMuPDF
    print("PyMuPDF is installed.")
    doc = fitz.open(pdf_path)
    print("Number of pages in PyMuPDF:", len(doc))
    
    empty_pages = 0
    non_empty_pages = []
    
    for i in range(len(doc)):
        page = doc[i]
        text = page.get_text()
        if not text.strip():
            empty_pages += 1
        else:
            non_empty_pages.append(i + 1)
            
    print(f"Empty pages: {empty_pages}")
    print(f"Non-empty pages count: {len(non_empty_pages)}")
    if non_empty_pages:
        print(f"First 10 non-empty pages: {non_empty_pages[:10]}")
        print(f"Last 10 non-empty pages: {non_empty_pages[-10:]}")
        
        # Print a sample page text
        sample_idx = non_empty_pages[min(5, len(non_empty_pages)-1)] - 1
        print(f"\n--- Sample Page {sample_idx+1} Text ---")
        print(doc[sample_idx].get_text()[:400] + "...")
        
except Exception as e:
    print("Error with PyMuPDF:", e)
