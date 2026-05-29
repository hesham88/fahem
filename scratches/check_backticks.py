with open(r'C:\Users\hesh1\Desktop\fahem\scripts\deploy\configure_cloud_armor.ps1', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    stripped = line.strip()
    if stripped.endswith('`'):
        next_line = lines[idx+1] if idx+1 < len(lines) else 'EOF'
        print(f"Line {idx+1}: '{stripped}' -> Next line: '{next_line.strip()}'")
