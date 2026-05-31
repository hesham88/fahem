import os
import json

WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DICT_DIR = os.path.join(WORKSPACE_DIR, "web", "src", "dictionaries")
LANGUAGES = ["ar", "de", "es", "fr", "it", "zh"]

def sync():
    en_path = os.path.join(DICT_DIR, "en.json")
    with open(en_path, "r", encoding="utf-8") as f:
        en_data = json.load(f)
        
    for lang in LANGUAGES:
        lang_path = os.path.join(DICT_DIR, f"{lang}.json")
        with open(lang_path, "r", encoding="utf-8") as f:
            lang_data = json.load(f)
            
        updated = False
        for key, val in en_data.items():
            if key not in lang_data:
                lang_data[key] = val
                updated = True
                
        if updated:
            # Save maintaining key order or English key order
            ordered_data = {}
            for key in en_data.keys():
                if key in lang_data:
                    ordered_data[key] = lang_data[key]
            # Add any extra keys just in case
            for key, val in lang_data.items():
                if key not in ordered_data:
                    ordered_data[key] = val
                    
            with open(lang_path, "w", encoding="utf-8") as f:
                json.dump(ordered_data, f, ensure_ascii=False, indent=2)
            print(f"[INFO] Synced missing keys to {lang}.json")
        else:
            print(f"[INFO] {lang}.json is already in sync")

if __name__ == "__main__":
    sync()
