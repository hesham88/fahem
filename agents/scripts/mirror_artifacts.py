#!/usr/bin/env python3
import os
import shutil
import sys
from datetime import datetime

WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACTS_DEST_DIR = os.path.join(WORKSPACE_DIR, "artifacts")

def mirror_artifacts(conversation_id):
    print(f"[*] Starting artifact mirroring for Conversation ID: {conversation_id}")
    
    # Locate user app data directory
    user_home = os.path.expanduser("~")
    system_artifacts_dir = os.path.join(user_home, ".gemini", "antigravity-cli", "brain", conversation_id)
    
    if not os.path.exists(system_artifacts_dir):
        print(f"[!] System artifacts directory not found: {system_artifacts_dir}")
        return False
        
    if not os.path.exists(ARTIFACTS_DEST_DIR):
        os.makedirs(ARTIFACTS_DEST_DIR)
        print(f"[+] Created local workspace artifacts directory: {ARTIFACTS_DEST_DIR}")
        
    copied_count = 0
    for file in os.listdir(system_artifacts_dir):
        if file.endswith(".md"):
            src_path = os.path.join(system_artifacts_dir, file)
            dest_path = os.path.join(ARTIFACTS_DEST_DIR, file)
            
            # If the file already exists in destination, save a backup revision
            if os.path.exists(dest_path):
                file_name, file_ext = os.path.splitext(file)
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_name = f"{file_name}_rev_{timestamp}{file_ext}"
                backup_path = os.path.join(ARTIFACTS_DEST_DIR, "revisions", backup_name)
                
                revisions_dir = os.path.join(ARTIFACTS_DEST_DIR, "revisions")
                if not os.path.exists(revisions_dir):
                    os.makedirs(revisions_dir)
                    
                shutil.copy2(dest_path, backup_path)
                print(f"[~] Saved revision backup: {backup_name}")
                
            shutil.copy2(src_path, dest_path)
            print(f"[+] Mirrored artifact: {file}")
            copied_count += 1
            
    print(f"[*] Successfully mirrored {copied_count} artifacts to local workspace.")
    return True

if __name__ == "__main__":
    conv_id = "d2709e7c-eb22-492c-b5a7-a7d1a2cf2849"
    if len(sys.argv) > 1:
        conv_id = sys.argv[1]
    success = mirror_artifacts(conv_id)
    sys.exit(0 if success else 1)
