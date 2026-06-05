import pypdf
import os

pdf_path = r"C:\Users\hesh1\Desktop\fahem\ignore\temp_book_introduction_to_python_programming_web_1780593796352.pdf"
print("File exists:", os.path.exists(pdf_path))
if os.path.exists(pdf_path):
    print("File size:", os.path.getsize(pdf_path), "bytes")
    try:
        reader = pypdf.PdfReader(pdf_path)
        print("Number of pages according to pypdf:", len(reader.pages))
        
        # print some page snippets
        for i in range(min(5, len(reader.pages))):
            text = reader.pages[i].extract_text() or ""
            print(f"\n--- Page {i+1} (Length: {len(text)}) ---")
            print(text[:150] + "...")
    except Exception as e:
        print("Error reading PDF:", e)
