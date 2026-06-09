#!/usr/bin/env python3
import os
import re
import sys
import io
from datetime import datetime

# Configure standard output to use UTF-8 (particularly on Windows console)
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

RUN_TIMESTAMP = datetime.now().isoformat()
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_SRC_DIR = os.path.join(WORKSPACE_DIR, "web", "src")

# Patterns to match
# 1. Inline bilingual checks like language === "ar" ? ... : ...
TERNARY_PATTERN = re.compile(r'\b(?:language|locale|lang)\s*===\s*[\'"]ar[\'"]', re.IGNORECASE)

# 2. Hardcoded string literal values for JSX attributes: title, placeholder, aria-label, alt
# Matches prop="string" or prop={"string"} but NOT prop={t("key")} or prop={isAr ? ".." : ".."}
PROP_PATTERN = re.compile(r'\b(title|placeholder|aria-label|alt)\s*=\s*(?:[\'"]([^\'"]+)[\'"]|\{\s*[\'"]([^\'"]+)[\'"]\s*\})', re.IGNORECASE)

# 3. Hardcoded text between JSX elements, e.g. <div>Text</div>
# Avoid matching expressions like {text} or lines with other JSX tags
JSX_TEXT_PATTERN = re.compile(r'>\s*([^<{]*?[A-Za-z\u0600-\u06FF]{2,}[^<{]*?)\s*<')

def scan_files():
    print(f"[{RUN_TIMESTAMP}] Starting automated scan for hardcoded string literals in JSX/TSX...")
    if not os.path.exists(WEB_SRC_DIR):
        print(f"[ERROR] web/src directory not found: {WEB_SRC_DIR}")
        sys.exit(1)

    offenders = []
    scanned_count = 0

    for root, dirs, files in os.walk(WEB_SRC_DIR):
        # Ignore common boilerplate or build dirs
        dirs[:] = [d for d in dirs if d not in [".next", "node_modules", "dist", "out"]]
        
        for file in files:
            if not file.endswith(".tsx"):
                continue
                
            scanned_count += 1
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, WORKSPACE_DIR)
            
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    lines = f.readlines()
                    
                for idx, line in enumerate(lines):
                    line_num = idx + 1
                    stripped = line.strip()
                    
                    # Ignore single-line comments or purely punctuation lines
                    if stripped.startswith("//") or stripped.startswith("*") or stripped.startswith("/*"):
                        continue
                        
                    # Ignore imports
                    if stripped.startswith("import ") or "from '" in stripped or 'from "' in stripped:
                        continue
                        
                    # Check 1: Inline bilingual checks
                    if TERNARY_PATTERN.search(line):
                        offenders.append({
                            "file": rel_path,
                            "line": line_num,
                            "type": "Inline Bilingual Ternary",
                            "code": stripped,
                            "detail": "Uses inline language === 'ar' ternary instead of dictionary key"
                        })
                        continue  # avoid double reporting the same line
                        
                    # Check 2: Un-translated attributes (title, placeholder, aria-label, alt)
                    prop_match = PROP_PATTERN.search(line)
                    if prop_match:
                        # Ensure it's not a translation key or variable (e.g. t('key'))
                        prop_name = prop_match.group(1)
                        prop_val = prop_match.group(2) or prop_match.group(3)
                        # Skip if it is purely uppercase (likely a constant) or simple symbols
                        if prop_val and not (prop_val.isupper() and len(prop_val) > 3):
                            offenders.append({
                                "file": rel_path,
                                "line": line_num,
                                "type": f"Hardcoded Prop '{prop_name}'",
                                "code": stripped,
                                "detail": f"Prop '{prop_name}' is set to hardcoded literal '{prop_val}' instead of t(...)"
                            })
                            continue
                            
                    # Check 3: JSX text
                    # We look for >Text< containing characters but not part of expression or script
                    # Avoid lines with "console.log" or functions
                    if "console.log" in stripped or "typeof " in stripped:
                        continue
                    
                    if any(op in line for op in ["&&", "||", "===", "!=="]) and ("<" in line and ">" in line):
                        continue
                    
                    jsx_match = JSX_TEXT_PATTERN.search(line)
                    if jsx_match:
                        text_val = jsx_match.group(1).strip()
                        # Exclude lines that are comments inside JSX like {/* ... */}
                        if text_val.startswith("{/*") or text_val.endswith("*/}"):
                            continue
                        # Exclude lines that only contain curly-braces or numbers/symbols
                        if re.match(r'^[{}()\s0-9\-\+\*\/&|!,.;:\?]+$', text_val):
                            continue
                        
                        offenders.append({
                            "file": rel_path,
                            "line": line_num,
                            "type": "Hardcoded JSX Text",
                            "code": stripped,
                            "detail": f"JSX tag contains hardcoded literal text: '{text_val}'"
                        })
                        
            except Exception as e:
                print(f"[WARNING] Failed to read {rel_path}: {e}")

    # Generate Report
    print("\n" + "="*70)
    print("HARDCODED STRINGS & TRANSLATION SCANNER REPORT")
    print("="*70)
    print(f"Timestamp: {RUN_TIMESTAMP}")
    print(f"Scanned files: {scanned_count} (.tsx)")
    print(f"Offending lines found: {len(offenders)}")
    print("="*70)

    if offenders:
        print("\nList of active offenders (file:line) [Truncated to 40 entries]:")
        # Sort by file and line number
        offenders_sorted = sorted(offenders, key=lambda x: (x["file"], x["line"]))
        for o in offenders_sorted[:40]:
            print(f" - {o['file']}:{o['line']} | {o['type']} | {o['detail']}")
            print(f"   Code: {o['code']}")
            print()
            
        if len(offenders_sorted) > 40:
            print(f" ... and {len(offenders_sorted) - 40} more offending lines.")
            
        print("\n[INFO] Please migrate these hardcoded literals to translation keys in your dictionaries.")
    else:
        print("\nExcellent! No hardcoded JSX text, hardcoded attributes, or inline bilingual checks found.")

    # Always return 0 as hardcoded strings are a reported linting diagnostic (not a strict failure unless requested)
    sys.exit(0)

if __name__ == "__main__":
    scan_files()
