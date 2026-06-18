import os
import json

def main():
    folder = "web/src/app/api"
    target_id = "book_introduction_to_python_programming_1780850976048"
    for filename in os.listdir(folder):
        if filename.startswith("tmp"):
            filepath = os.path.join(folder, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    for line_idx, line in enumerate(f):
                        if target_id in line:
                            print(f"File {filename} (line {line_idx + 1}):")
                            print(line[:300] + "...")
                            print("-" * 50)
                            break
            except Exception as e:
                print(f"Error reading {filename}: {e}")

if __name__ == "__main__":
    main()
