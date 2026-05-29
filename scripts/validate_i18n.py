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
    print(f"[{RUN_TIMESTAMP}] Running automated i18n review for the 7 languages...")
    
    if not os.path.exists(DICT_DIR):
        print(f"[ERROR] Dictionaries directory not found: {DICT_DIR}")
        sys.exit(1)
        
    dictionaries = {}
    all_keys = set()
    
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
                all_keys.update(data.keys())
        except Exception as e:
            print(f"[ERROR] Failed to parse {lang}.json: {e}")
            sys.exit(1)
            
    print(f"[INFO] Loaded all 7 language dictionaries successfully.")
    print(f"[INFO] Total unique keys across all dictionaries: {len(all_keys)}")
    
    # 2. Check for alignment
    out_of_sync = False
    comparison_report = []
    
    for key in sorted(all_keys):
        missing_in = []
        for lang in LANGUAGES:
            if key not in dictionaries[lang]:
                missing_in.append(lang)
                
        if missing_in:
            out_of_sync = True
            missing_langs = ", ".join(missing_in)
            comparison_report.append(f"Key '{key}' is missing in: [{missing_langs}]")
            
    # 3. Print report
    print("\n" + "="*50)
    print("INTERNATIONALIZATION (I18N) REPORT")
    print("="*50)
    print(f"Timestamp: {RUN_TIMESTAMP}")
    print(f"Status: {'[FAIL] OUT OF SYNC' if out_of_sync else '[PASS] 100% COMPLIANT'}")
    print("="*50)
    
    if out_of_sync:
        print("\nFindings:")
        for line in comparison_report:
            print(f" - {line}")
        print("\n[REMEDY] Make sure all keys are populated across all 7 translation dictionaries.")
        sys.exit(1)
    else:
        print("\nExcellent! All translation keys are perfectly aligned and present in all 7 languages.")
        print("No missing texts, labels, or keys found.")
        sys.exit(0)

if __name__ == "__main__":
    run_validation()
