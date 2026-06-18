import json
import os

def main():
    folder = "web/src/app/api"
    target_id = "book_introduction_to_python_programming_1780850976048"
    for filename in os.listdir(folder):
        if filename.startswith("tmp"):
            filepath = os.path.join(folder, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                    if target_id in content:
                        print(f"File: {filename}")
                        # load as json if possible
                        try:
                            data = json.loads(content)
                            print(f"  Type: {type(data)}")
                            if isinstance(data, dict):
                                print(f"  Keys: {list(data.keys())}")
                                for k, v in data.items():
                                    if isinstance(v, list):
                                        print(f"    Key '{k}' list len: {len(v)}")
                                        if len(v) > 0 and isinstance(v[0], dict):
                                            print(f"    Sample item keys: {list(v[0].keys())}")
                            elif isinstance(data, list):
                                print(f"  List len: {len(data)}")
                                if len(data) > 0 and isinstance(data[0], dict):
                                    print(f"  Sample item keys: {list(data[0].keys())}")
                        except Exception as e:
                            print(f"  (Not valid JSON: {e})")
                            # print first 500 chars
                            print(content[:500])
                        print("-" * 50)
            except Exception as e:
                pass

if __name__ == "__main__":
    main()
