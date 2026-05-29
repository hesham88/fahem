with open(r'C:\Users\hesh1\Desktop\fahem\scripts\deploy\configure_cloud_armor.ps1', 'rb') as f:
    data = f.read()

# Decode to utf-8
text = data.decode('utf-8', errors='ignore')

# Standardize line endings to \r\n (standard for Windows PowerShell)
lines = text.splitlines()
cleaned_lines = [line.rstrip() for line in lines]
cleaned_content = '\r\n'.join(cleaned_lines) + '\r\n'

with open(r'C:\Users\hesh1\Desktop\fahem\scripts\deploy\configure_cloud_armor.ps1', 'wb') as f:
    f.write(cleaned_content.encode('utf-8'))

print("File cleaned successfully!")
