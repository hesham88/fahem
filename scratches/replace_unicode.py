import os

ps_file = r'C:\Users\hesh1\Desktop\fahem\scripts\deploy\configure_cloud_armor.ps1'
with open(ps_file, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Replace Unicode ✓ checkmark with [OK]
content_fixed = content.replace('✓', '[OK]')

# Write back as UTF-8 with BOM to make Windows PowerShell 100% happy!
with open(ps_file, 'w', encoding='utf-8-sig', newline='\r\n') as f:
    f.write(content_fixed)

print("Unicode characters replaced and file saved with UTF-8 BOM encoding!")
