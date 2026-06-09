#!/usr/bin/env python3
import os
import json
import sys
import io
import re
from datetime import datetime

# Configure standard output to use UTF-8 (particularly on Windows console)
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

RUN_TIMESTAMP = datetime.now().isoformat()
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DICT_DIR = os.path.join(WORKSPACE_DIR, "web", "src", "dictionaries")

LANGUAGES = ["en", "ar", "de", "es", "fr", "it", "zh"]

# --- JSX i18n Scanner Regex Patterns ---
TERNARY_PATTERN = re.compile(r'\b(?:language|locale|lang)\s*===\s*[\'"]ar[\'"]', re.IGNORECASE)
PROP_PATTERN = re.compile(r'\b(title|placeholder|aria-label|alt)\s*=\s*(?:[\'"]([^\'"]+)[\'"]|\{\s*[\'"]([^\'"]+)[\'"]\s*\})', re.IGNORECASE)
JSX_TEXT_PATTERN = re.compile(r'>\s*([^<{]*?[A-Za-z\u0600-\u06FF]{2,}[^<{]*?)\s*<')

def run_parser_tests():
    print(f"[{datetime.now().isoformat()}] Running automated unit tests for JSX i18n parser patterns...")
    
    # 1. Ternary Pattern Tests (Inline bilingual check detection)
    ternary_positives = [
        "const title = language === 'ar' ? 'أهلاً' : 'Hello';",
        "const sub = locale === \"ar\" ? \"مرحبا\" : \"Hi\";",
        "let x = lang==='AR' ? 'ar' : 'en';"
    ]
    ternary_negatives = [
        "const title = t('welcome');",
        "if (lang === 'en') {",
        "const isAr = language === 'en';"
    ]
    
    for tc in ternary_positives:
        if not TERNARY_PATTERN.search(tc):
            print(f"[FAIL] TERNARY_PATTERN failed to match positive case: \"{tc}\"")
            return False
            
    for tc in ternary_negatives:
        if TERNARY_PATTERN.search(tc):
            print(f"[FAIL] TERNARY_PATTERN incorrectly matched negative case: \"{tc}\"")
            return False

    # 2. Prop Pattern Tests (Hardcoded attributes)
    prop_positives = [
        '<input placeholder="Enter your name" />',
        '<img alt={"profile picture"} />',
        '<button title="click here">Submit</button>',
        'aria-label="close popup"'
    ]
    prop_negatives = [
        '<input placeholder={t("enter_name")} />',
        '<img alt={user.avatar} />',
        '<button title={isAr ? t("ar_title") : t("en_title")}>Submit</button>',
        'title={TITLE_CONST_UPPER}'
    ]
    
    for tc in prop_positives:
        if not PROP_PATTERN.search(tc):
            print(f"[FAIL] PROP_PATTERN failed to match positive case: \"{tc}\"")
            return False
            
    for tc in prop_negatives:
        match = PROP_PATTERN.search(tc)
        if match:
            # Replicate filtering from scan_hardcoded_strings.py (skip uppercase constants)
            prop_val = match.group(2) or match.group(3)
            if not (prop_val and prop_val.isupper() and len(prop_val) > 3):
                print(f"[FAIL] PROP_PATTERN incorrectly matched negative case: \"{tc}\"")
                return False

    # 3. JSX Text Pattern Tests (Hardcoded inner element text)
    jsx_positives = [
        "<div>Hello World</div>",
        "<span>تحميل المزيد</span>",
        "<h3>Welcome to Fahem!</h3>"
    ]
    jsx_negatives = [
        "<div>{t('hello')}</div>",
        "<span>{username}</span>",
        "<div>{/* some comment */}</div>",
        "<div>{count + 1}</div>",
        "if (num >= 1 && num <= 30)" # should not match as JSX text
    ]
    
    for tc in jsx_positives:
        if not JSX_TEXT_PATTERN.search(tc):
            print(f"[FAIL] JSX_TEXT_PATTERN failed to match positive case: \"{tc}\"")
            return False
            
    for tc in jsx_negatives:
        # Replicate filtering from scan_hardcoded_strings.py / validate_i18n.py
        if any(op in tc for op in ["&&", "||", "===", "!=="]) and ("<" in tc and ">" in tc):
            continue
            
        match = JSX_TEXT_PATTERN.search(tc)
        if match:
            text_val = match.group(1).strip()
            if text_val.startswith("{/*") or text_val.endswith("*/}"):
                continue
            if re.match(r'^[{}()\s0-9\-\+\*\/&|!,.;:\?]+$', text_val):
                continue
            print(f"[FAIL] JSX_TEXT_PATTERN incorrectly matched negative case: \"{tc}\" (text extracted: '{text_val}')")
            return False

    print("✓ All JSX i18n parser unit tests passed successfully!")
    return True

def run_validation():
    print(f"[{RUN_TIMESTAMP}] Starting canonical i18n verification suite...")
    
    # Run the regex parser unit tests first
    if not run_parser_tests():
        print("[ERROR] JSX i18n parser unit tests failed. Aborting verification.")
        sys.exit(1)
        
    print("\n[INFO] Proceeding with dictionary structure alignment checks...")
    if not os.path.exists(DICT_DIR):
        print(f"[ERROR] Dictionaries directory not found: {DICT_DIR}")
        sys.exit(1)
        
    dictionaries = {}
    
    # 1. Load dictionaries
    for lang in LANGUAGES:
        file_path = os.path.join(DICT_DIR, f"{lang}.json")
        if not os.path.exists(file_path):
            print(f"[ERROR] Missing dictionary file: {lang}.json")
            sys.exit(1)
            
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                dictionaries[lang] = data
        except Exception as e:
            print(f"[ERROR] Failed to parse {lang}.json: {e}")
            sys.exit(1)
            
    print(f"[INFO] Loaded all 7 language dictionaries successfully.")
    
    en_dict = dictionaries["en"]
    en_keys = set(en_dict.keys())
    print(f"[INFO] Canonical English (en.json) contains {len(en_keys)} keys.")
    
    # 2. Check for alignment, extra keys, and empty values
    out_of_sync = False
    findings = []
    
    for lang in LANGUAGES:
        lang_dict = dictionaries[lang]
        lang_keys = set(lang_dict.keys())
        
        # Check for missing keys (present in en but not in lang)
        missing_keys = en_keys - lang_keys
        if missing_keys:
            out_of_sync = True
            for key in sorted(missing_keys):
                findings.append(f"[{lang}.json] Missing translation key: '{key}' (exists in en.json)")
                
        # Check for extra keys (present in lang but not in en)
        if lang != "en":
            extra_keys = lang_keys - en_keys
            if extra_keys:
                out_of_sync = True
                for key in sorted(extra_keys):
                    findings.append(f"[{lang}.json] Extra translation key: '{key}' (not in canonical en.json)")
                    
        # Check for empty or whitespace-only values
        for key, val in lang_dict.items():
            if val is None or (isinstance(val, str) and val.strip() == ""):
                out_of_sync = True
                findings.append(f"[{lang}.json] Empty or whitespace-only value for key: '{key}'")
                
    # 3. Print report
    print("\n" + "="*60)
    print("INTERNATIONALIZATION (I18N) CANONICAL REPORT")
    print("="*60)
    print(f"Timestamp: {RUN_TIMESTAMP}")
    print(f"Status: {'[FAIL] OUT OF SYNC' if out_of_sync else '[PASS] 100% COMPLIANT'}")
    print("="*60)
    
    if out_of_sync:
        print(f"\nFound {len(findings)} issues:")
        for line in findings:
            print(f" - {line}")
        print("\n[REMEDY] Resolve missing/extra keys and empty values across translation dictionaries.")
        sys.exit(1)
    else:
        print("\nExcellent! All translation keys are perfectly aligned and present in all 7 languages.")
        print("No missing, extra, or empty translation keys found.")
        sys.exit(0)

if __name__ == "__main__":
    run_validation()
