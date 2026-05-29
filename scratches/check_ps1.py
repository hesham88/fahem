import re

with open(r'C:\Users\hesh1\Desktop\fahem\scripts\deploy\configure_cloud_armor.ps1', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.splitlines()

# Parse brackets and try/catch matching
brace_stack = []
for idx, line in enumerate(lines):
    for col, char in enumerate(line):
        if char == '{':
            brace_stack.append(('{', idx+1, col+1, line))
        elif char == '}':
            if brace_stack:
                brace_stack.pop()
            else:
                print(f"Mismatched '}}' at line {idx+1}, col {col+1}: {line}")

if brace_stack:
    print(f"Unclosed braces left in stack:")
    for b in brace_stack:
        print(f"Line {b[1]}, col {b[2]}: {b[3].strip()}")
else:
    print("All braces are perfectly balanced!")
