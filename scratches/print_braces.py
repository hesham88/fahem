with open(r'C:\Users\hesh1\Desktop\fahem\scripts\deploy\configure_cloud_armor.ps1', 'r', encoding='utf-8') as f:
    lines = f.readlines()

indent = 0
for idx, line in enumerate(lines):
    # count braces
    opens = line.count('{')
    closes = line.count('}')
    if opens > 0 or closes > 0:
        cleaned = line.strip()
        print(f"Line {idx+1:03d} (Open={opens}, Close={closes}): {cleaned}")
