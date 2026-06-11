import os

file_path = r"C:\Users\hesh1\Desktop\fahem\web\src\components\StickyChat.tsx"
queries = ["api/agent", "selected_book_ids", "selectedBookIds", "selected_book", "selectedBook"]

print(f"Searching in {file_path}:")
if os.path.exists(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    for i, line in enumerate(lines):
        for q in queries:
            if q in line:
                print(f"Line {i+1}: {line.strip()}")
else:
    print("File not found!")
