#!/usr/bin/env python3
import os
import json
import sys
from datetime import datetime

RUN_TIMESTAMP = datetime.now().isoformat()
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DICT_DIR = os.path.join(WORKSPACE_DIR, "web", "src", "dictionaries")

LANGUAGES = ["en", "ar", "de", "es", "fr", "it", "zh"]

def run_validation():
    print(f"[{RUN_TIMESTAMP}] Running canonical i18n review for the 7 languages...")
    
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
