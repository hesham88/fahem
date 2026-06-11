import os

target_dir = r"C:\Users\hesh1\Desktop\fahem\web"
queries = ["/api/agent", "selected_book_ids", "book_id"]

for root, dirs, files in os.walk(target_dir):
    if "node_modules" in root or ".next" in root:
        continue
    for file in files:
        if file.endswith((".ts", ".tsx", ".js", ".jsx")):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    for q in queries:
                        if q in content:
                            print(f"Found '{q}' in {path}")
            except Exception as e:
                pass
