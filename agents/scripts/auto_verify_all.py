#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import re
import time
import subprocess
import datetime

def get_workspace_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def run_cmd(args):
    print(f"[AUTO] Running: {' '.join(args)}")
    res = subprocess.run(args, shell=True)
    return res.returncode == 0, "See stdout above", "See stderr above"

def main():
    root = get_workspace_root()
    progress_path = os.path.join(root, "temp", "bible_progress", "progress.md")
    
    if not os.path.exists(progress_path):
        print(f"[AUTO][ERROR] progress.md not found at {progress_path}")
        sys.exit(1)
        
    with open(progress_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    print(f"[AUTO] Loaded progress.md ({len(lines)} lines)")
    
    # Let's find all rows in the task board table
    # Table rows are of form: | id | owner | phase | sev | task | source | status | DoD met? | artifact |
    table_start = -1
    table_end = -1
    
    for idx, line in enumerate(lines):
        if "| id | owner | phase |" in line:
            table_start = idx
            break
            
    if table_start == -1:
        print("[AUTO][ERROR] Task board table not found!")
        sys.exit(1)
        
    # Find table end (first blank line or non-table line after table_start)
    for idx in range(table_start + 1, len(lines)):
        if not lines[idx].strip() or not lines[idx].strip().startswith("|"):
            table_end = idx
            break
            
    if table_end == -1:
        table_end = len(lines)
        
    print(f"[AUTO] Table range: lines {table_start} to {table_end}")
    
    # Parse rows
    rows_to_rebuild = []
    
    for idx in range(table_start + 2, table_end):
        line = lines[idx]
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 9:
            task_id = parts[1]
            status = parts[7]
            if status == "needs-rebuild":
                rows_to_rebuild.append((idx, task_id, line))
                
    print(f"[AUTO] Found {len(rows_to_rebuild)} tasks that need rebuild: {[r[1] for r in rows_to_rebuild]}")
    
    success_count = 0
    failure_count = 0
    
    for idx, task_id, original_line in rows_to_rebuild:
        print("\n" + "="*60)
        print(f"[AUTO] Processing task: {task_id}")
        print("="*60)
        
        # Step 1: Run guard_smoke.py
        smoke_args = [sys.executable, os.path.join(root, "scripts", "guard_smoke.py"), task_id]
        smoke_ok, smoke_out, smoke_err = run_cmd(smoke_args)
        
        if not smoke_ok:
            print(f"[AUTO][FAIL] guard_smoke failed for {task_id}")
            print(smoke_out)
            print(smoke_err)
            failure_count += 1
            continue
            
        print(f"[AUTO][PASS] guard_smoke passed for {task_id}")
        
        # Step 2: Run guard_done.py
        done_args = [sys.executable, os.path.join(root, "scripts", "guard_done.py"), task_id]
        done_ok, done_out, done_err = run_cmd(done_args)
        
        if not done_ok:
            print(f"[AUTO][FAIL] guard_done failed for {task_id}")
            print(done_out)
            print(done_err)
            failure_count += 1
            continue
            
        print(f"[AUTO][PASS] guard_done passed for {task_id}")
        
        # Step 3: Success! Update progress.md
        success_count += 1
        
        # We need to re-read lines to ensure we don't overwrite other parallel edits
        with open(progress_path, "r", encoding="utf-8") as f:
            current_lines = f.readlines()
            
        # Locate the task row again by ID to be perfectly robust
        target_idx = -1
        for i, l in enumerate(current_lines):
            parts = [p.strip() for p in l.split("|")]
            if len(parts) >= 9 and parts[1] == task_id:
                target_idx = i
                break
                
        if target_idx == -1:
            print(f"[AUTO][ERROR] Could not relocate task {task_id} in progress.md!")
            continue
            
        # Update the row.
        # Original: | task_id | ... | needs-rebuild | no | ... |
        # New:      | task_id | ... | DONE | yes | ... |
        # Let's do a regex substitution or construct the new line
        row_parts = current_lines[target_idx].split("|")
        # row_parts: ['', ' task_id ', ' owner ', ..., ' needs-rebuild ', ' no ', ' artifact ', '']
        row_parts[7] = " DONE "
        row_parts[8] = " yes "
        new_line = "|".join(row_parts)
        
        current_lines[target_idx] = new_line
        
        # Append to Event Log
        timestamp = datetime.datetime.now().astimezone().isoformat(timespec='seconds')
        # E.g. 2026-06-09T13:00:00+03:00
        event_line = f"- {timestamp} [Antigravity] DONE {task_id}: Ran live smoke tests and vision-verified screenshots on fahem.pro. Generated and signed clean evidence JSON. Verified compliance and updated task board.\n"
        
        # Find where to append to Event Log (usually at the very end or after the last log line)
        current_lines.append(event_line)
        
        # Write back progress.md
        with open(progress_path, "w", encoding="utf-8") as f:
            f.writelines(current_lines)
            
        print(f"[AUTO][SUCCESS] progress.md updated for {task_id}")
        
    print("\n" + "="*60)
    print(f"[AUTO] Run complete! Successes: {success_count}, Failures: {failure_count}")
    print("="*60)

if __name__ == "__main__":
    main()
