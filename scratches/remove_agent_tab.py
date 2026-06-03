import os
import re

file_path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\[locale]\home\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace adminTabs definition
old_admin_tabs = 'const adminTabs = ["agent", "admin", "super-admin-users"];'
new_admin_tabs = 'const adminTabs = ["admin", "super-admin-users"];'

if old_admin_tabs in content:
    content = content.replace(old_admin_tabs, new_admin_tabs)
    print("Successfully replaced adminTabs array.")
else:
    # try with different quotes or spaces
    content = re.sub(r'const\s+adminTabs\s*=\s*\[\s*"agent"\s*,\s*"admin"\s*,\s*"super-admin-users"\s*\]\s*;', 'const adminTabs = ["admin", "super-admin-users"];', content)
    print("Replaced adminTabs via regex.")

# 2. Replace case "agent" in getTabHeader
# Let's locate:
#       case "agent":
#         return {
#           title: t("dashboard_title"),
#           subtitle: t("dashboard_subtitle")
#         };
# (supporting any newline format)
old_case_agent_pattern = r'\s*case\s*"agent"\s*:\s*return\s*\{\s*title:\s*t\("dashboard_title"\),\s*subtitle:\s*t\("dashboard_subtitle"\)\s*\}\s*;'
content = re.sub(old_case_agent_pattern, "", content)
print("Successfully removed case 'agent' from getTabHeader.")

# 3. Remove sidebar navigation button
sidebar_btn_pattern = r'\s*<button\s+onClick=\{\(\)\s*=>\s*setActiveTab\("agent"\)\}\s+className=\{`sidebar-nav-btn\s+\$\{activeTab\s*===\s*"agent"\s*\?\s*"active"\s*:\s*""\}`\}\s+type="button"\s*>\s*<FiCpu\s*/>\s*<span>\{\s*t\("nav_toolkit"\)\s*\}</span>\s*</button>'
content = re.sub(sidebar_btn_pattern, "", content)
print("Successfully removed sidebar button for 'agent'.")

# 4. Remove activeTab === "agent" ? ( ... ) : activeTab === "admin" ? ( ...
# We find the start index of '{activeTab === "agent" ? ('
# and the end index at ') : activeTab === "admin" ? ('
idx_start = content.find('{activeTab === "agent" ? (')
if idx_start == -1:
    print("Error: Could not find start of activeTab === 'agent' rendering block!")
    exit(1)

# Find the matching closing structure.
# Let's find ') : activeTab === "admin" ? (' after idx_start
idx_end = content.find(') : activeTab === "admin" ? (', idx_start)
if idx_end == -1:
    print("Error: Could not find closing marker ) : activeTab === 'admin' ? (")
    exit(1)

# We want to replace everything from idx_start to idx_end + length of closing marker
# with: {activeTab === "admin" ? (
old_block_part = content[idx_start:idx_end + len(') : activeTab === "admin" ? (')]
new_block_part = '{activeTab === "admin" ? ('

content = content[:idx_start] + new_block_part + content[idx_end + len(') : activeTab === "admin" ? ('):]
print("Successfully replaced large activeTab === 'agent' render block with 'admin' tab condition.")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("All modifications completed successfully!")
