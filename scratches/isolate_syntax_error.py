import subprocess
import os

ps_file = r'C:\Users\hesh1\Desktop\fahem\scripts\deploy\configure_cloud_armor.ps1'
with open(ps_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Test progressively larger prefixes
for i in range(1, len(lines) + 1):
    prefix_lines = lines[:i]
    prefix_code = "".join(prefix_lines)
    
    # Balance braces in prefix_code
    open_count = prefix_code.count('{')
    close_count = prefix_code.count('}')
    if open_count > close_count:
        # Append closing braces to balance
        prefix_code += '\n' + '}' * (open_count - close_count)
    elif close_count > open_count:
        # We have too many closing braces, which is a structural error in this prefix
        # We can print and investigate
        print(f"Prefix up to line {i} has too many closing braces!")
        break

    # Write to a temp file to compile
    temp_file = r'C:\Users\hesh1\Desktop\fahem\scratches\temp_compile.ps1'
    with open(temp_file, 'w', encoding='utf-8') as tf:
        tf.write(prefix_code)

    # Compile via PowerShell
    cmd = ['powershell', '-Command', f'[scriptblock]::Create((Get-Content "{temp_file}" -Raw))']
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        # If it fails, let's see if it's a real syntax error or just mismatched blocks we didn't balance
        err = result.stderr or result.stdout
        # If the error is not about unexpected closing brace or missing block structure, print it
        if "Unexpected token" in err or "Missing" in err:
            # Check if this error is specific to this line
            print(f"Compilation fails at line {i}!")
            print(f"Line {i} content: {lines[i-1].strip()}")
            print(f"Error: {err.strip()}")
            break

print("Diagnostic complete!")
