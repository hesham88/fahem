import re
import os

files_to_migrate = [
    {
        "path": r"C:\Users\hesh1\Desktop\fahem\web\src\app\[locale]\home\page.tsx",
        "import_path": "../../../lib/authedFetch"
    },
    {
        "path": r"C:\Users\hesh1\Desktop\fahem\web\src\components\dashboard\LibraryPanel.tsx",
        "import_path": "../../lib/authedFetch"
    },
    {
        "path": r"C:\Users\hesh1\Desktop\fahem\web\src\app\[locale]\profile\[username]\page.tsx",
        "import_path": "../../../../lib/authedFetch"
    },
    {
        "path": r"C:\Users\hesh1\Desktop\fahem\web\src\app\[locale]\report\page.tsx",
        "import_path": "../../../lib/authedFetch"
    }
]

for item in files_to_migrate:
    file_path = item["path"]
    import_path = item["import_path"]
    
    if not os.path.exists(file_path):
        print(f"Skipping {file_path} (does not exist)")
        continue
        
    print(f"Migrating {file_path}...")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # 1. Replace fetch("/api/..."), fetch(`/api/...`), fetch(endpoint, ...), fetch(url, ...), fetch(subjectsRes, ...), etc.
    # We want to match: fetch("/api/..." OR fetch(`/api/...` OR fetch("endpoint" OR fetch("url" etc.
    # To be extremely safe, we replace fetch("/api" -> authedFetch("/api", fetch(`/api` -> authedFetch(`/api`.
    # Let's inspect if there are fetch calls with variables instead of literal string paths in these files.
    # In StickyChat, we had: const res = await fetch(endpoint, ...) which we already fixed.
    # In home/page.tsx, let's verify if there are dynamic fetch(endpoint) or similar calls.
    # Let's see: we had re-grepped:
    # Line 2978: fetch(`/api/places/search?query=...`) -> fetch(`/api/...`
    # Line 3022: fetch("/api/agent")
    # Line 3856: fetch("/api/agent/grounded")
    # Line 4112: fetch("/api/agent")
    # Line 4398: fetch("/api/agent")
    # Line 3177: fetch(`/api/user/profile?userId=...`)
    # Line 3644: fetch(`/api/user/profile?userId=...`)
    # Line 3695: fetch(`/api/history/detail?sessionId=...`)
    # Line 3808: fetch(`/api/admin/check?email=...`)
    # Let's use regex to replace: re.sub(r'\bfetch\s*\(\s*(["`])/api', r'authedFetch(\1/api', content)
    # This is extremely precise and safe!
    
    new_content, count = re.subn(r'\bfetch\s*\(\s*(["`])/api', r'authedFetch(\1/api', content)
    
    if count > 0:
        print(f"  Replaced {count} occurrences of fetch(/api...) with authedFetch(/api...)")
        
        # 2. Add the import statement if not already present
        if "authedFetch" not in content:
            # Let's find "use client"; at the top or first line
            if '"use client";' in new_content:
                new_content = new_content.replace(
                    '"use client";',
                    f'"use client";\nimport {{ authedFetch }} from "{import_path}";'
                )
                print(f"  Added import to 'use client' file: {file_path}")
            elif "'use client';" in new_content:
                new_content = new_content.replace(
                    "'use client';",
                    f"'use client';\nimport {{ authedFetch }} from '{import_path}';"
                )
                print(f"  Added import to 'use client' file: {file_path}")
            else:
                # Just insert it at the very top or first import statement
                lines = new_content.splitlines()
                inserted = False
                for i, line in enumerate(lines):
                    if line.strip().startswith("import "):
                        lines.insert(i, f'import {{ authedFetch }} from "{import_path}";')
                        inserted = True
                        break
                if inserted:
                    new_content = "\n".join(lines)
                    print(f"  Added import to top of imports: {file_path}")
                else:
                    new_content = f'import {{ authedFetch }} from "{import_path}";\n' + new_content
                    print(f"  Prepend import to file: {file_path}")
        else:
            print(f"  authedFetch was already imported / mentioned in file.")
            
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
    else:
        print("  No occurrences found.")

print("All migrations finished successfully! ✨")
