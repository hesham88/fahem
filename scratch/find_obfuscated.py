import os

search_terms = ['moe', 'ministry', 'ellibrary', '"mo" + "e"', '"mo"+"e"', '"mi" + "nist" + "ry"']

for root, dirs, files in os.walk(r'C:\Users\hesh1\Desktop\fahem\web\src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
                for i, line in enumerate(lines):
                    line_lower = line.lower()
                    found = False
                    for term in search_terms:
                        if term in line_lower:
                            found = True
                    # Also check for split versions
                    if ('"mo"' in line and '"e"' in line) or ('"mi"' in line and '"nist"' in line and '"ry"' in line):
                        found = True
                    if found:
                        print(f"{os.path.relpath(filepath, r'C:\Users\hesh1\Desktop\fahem')}:{i+1}: {line.strip()}")
            except Exception as e:
                pass
