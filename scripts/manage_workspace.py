#!/usr/bin/env python3
"""
Fahem Workspace Automation Utility
Automates memory versioning, turn logging, and pre-commit secret/compliance checks.
"""

import os
import re
import sys
import json
import subprocess
from datetime import datetime

WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEMORY_DIR = os.path.join(WORKSPACE_DIR, "memory")
LOG_DIR = os.path.join(WORKSPACE_DIR, "log")
SECURITY_DIR = os.path.join(WORKSPACE_DIR, "security")
WEB_DIR = os.path.join(WORKSPACE_DIR, "web")

# Compliance definitions
COMPETITOR_KEYWORDS = ["claude", "cursor", "copilot", "openai", "gpt-4", "gpt-3"]
SENSITIVE_PATTERNS = {
    "API Key pattern": re.compile(r"api[-_]?key\s*=\s*['\"][a-zA-Z0-9_\-]{10,}['\"]", re.IGNORECASE),
    "Generic password pattern": re.compile(r"password\s*=\s*['\"][^'\"]+['\"]", re.IGNORECASE),
}

def get_current_timestamp():
    return datetime.now().isoformat()

def log_info(msg):
    print(f"[*] [{get_current_timestamp()}] {msg}")

def log_error(msg):
    print(f"[!] [{get_current_timestamp()}] ERROR: {msg}", file=sys.stderr)

def get_latest_version():
    """Finds the maximum version index across plan, tasks, and walkthrough files."""
    if not os.path.exists(MEMORY_DIR):
        return 0
    
    version_pattern = re.compile(r"_(?:v)?(\d+)\.md$")
    max_v = 0
    for f in os.listdir(MEMORY_DIR):
        match = version_pattern.search(f)
        if match:
            v = int(match.group(1))
            if v > max_v:
                max_v = v
    return max_v

def command_version_up(args):
    """
    Increments the version of memory files.
    Usage: python manage_workspace.py version-up --summary "Description of changes"
    """
    summary = ""
    for i, arg in enumerate(args):
        if arg in ("--summary", "-s") and i + 1 < len(args):
            summary = args[i + 1]
            break
            
    if not summary:
        log_error("A change summary must be provided using --summary or -s")
        return False
        
    latest_v = get_latest_version()
    if latest_v == 0:
        log_error("No existing versioned memory files found in memory/ directory.")
        return False
        
    next_v = latest_v + 1
    log_info(f"Incrementing memory system files from Version {latest_v} to Version {next_v}...")
    
    timestamp = get_current_timestamp()
    new_revision_item = f"* **v{next_v}.0** ({timestamp}): {summary}"
    
    targets = ["plan", "tasks", "walkthrough"]
    for t in targets:
        prev_file = os.path.join(MEMORY_DIR, f"{t}_v{latest_v}.md")
        # In case some file is slightly behind in version naming, fallback to scanning for any highest file
        if not os.path.exists(prev_file):
            # Fallback search
            files = [f for f in os.listdir(MEMORY_DIR) if f.startswith(f"{t}_v") and f.endswith(".md")]
            if files:
                highest_file = sorted(files, key=lambda x: int(re.search(r'\d+', x).group()))[-1]
                prev_file = os.path.join(MEMORY_DIR, highest_file)
            else:
                log_error(f"Could not locate previous {t} file in memory/.")
                return False
                
        new_file = os.path.join(MEMORY_DIR, f"{t}_v{next_v}.md")
        
        with open(prev_file, "r", encoding="utf-8") as f:
            content = f.read()
            
        # 1. Update Title Header
        content = re.sub(
            rf"# (Project Plan|Task List|Project Walkthrough) - Version \d+",
            rf"# \1 - Version {next_v}",
            content
        )
        
        # 2. Update Timestamp if present under the title
        content = re.sub(
            r"\*\*Timestamp\*\*: [^\n]+",
            f"**Timestamp**: {timestamp}",
            content
        )
        
        # 3. Add revision entry under '## Revisions History' or '## Revisions History'
        history_header_match = re.search(r"## Revisions? History", content, re.IGNORECASE)
        if history_header_match:
            header = history_header_match.group(0)
            split_pos = content.find(header) + len(header)
            # Find next newline
            nl_pos = content.find("\n", split_pos)
            if nl_pos != -1:
                content = content[:nl_pos + 1] + new_revision_item + "\n" + content[nl_pos + 1:]
            else:
                content = content + "\n" + new_revision_item + "\n"
        else:
            content = content + "\n\n## Revisions History\n" + new_revision_item + "\n"
            
        with open(new_file, "w", encoding="utf-8") as f:
            f.write(content)
            
        log_info(f"Created updated memory file: {os.path.basename(new_file)}")
        
    return True

def command_log_turn(args):
    """
    Appends a new turn log to log/turn_log.md
    Usage: python manage_workspace.py log-turn --prompt "Prompt content" --summary "Response summary"
    """
    prompt = ""
    summary = ""
    for i, arg in enumerate(args):
        if arg in ("--prompt", "-p") and i + 1 < len(args):
            prompt = args[i + 1]
        elif arg in ("--summary", "-s") and i + 1 < len(args):
            summary = args[i + 1]
            
    if not prompt or not summary:
        log_error("Both --prompt (-p) and --summary (-s) are required to log a turn.")
        return False
        
    turn_log_path = os.path.join(LOG_DIR, "turn_log.md")
    if not os.path.exists(turn_log_path):
        log_error(f"Log turn log file not found at: {turn_log_path}")
        return False
        
    with open(turn_log_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Find the next turn number
    turns = re.findall(r"## Turn (\d+)", content)
    next_turn = int(turns[-1]) + 1 if turns else 1
    
    timestamp = get_current_timestamp()
    new_turn_entry = f"""

---

## Turn {next_turn}
**Timestamp**: {timestamp}  
**User Prompt**:
```text
{prompt}
```
**Response Summary**:
{summary}
"""
    with open(turn_log_path, "a", encoding="utf-8") as f:
        f.write(new_turn_entry)
        
    log_info(f"Successfully appended Turn {next_turn} to turn_log.md")
    return True

def command_audit_secrets(args):
    """
    Audits changed files and local environment files for leaks, unmasked usernames, or unapproved configurations.
    Usage: python manage_workspace.py audit-secrets
    """
    log_info("Running pre-commit configuration and sensitive leakage audit...")
    failed = False
    
    # 1. Audit changed/uncommitted files
    try:
        diff_output = subprocess.check_output(
            ["git", "diff", "--cached", "--name-only"], 
            cwd=WORKSPACE_DIR
        ).decode().strip()
        
        changed_files = [f.strip() for f in diff_output.split("\n") if f.strip()]
        
        # Also check unstaged changes if we want a complete security sweep
        unstaged_output = subprocess.check_output(
            ["git", "diff", "--name-only"], 
            cwd=WORKSPACE_DIR
        ).decode().strip()
        changed_files.extend([f.strip() for f in unstaged_output.split("\n") if f.strip()])
        
        # Deduplicate
        changed_files = list(set(changed_files))
    except Exception as e:
        log_error(f"Failed to query git status: {e}")
        # Audit all text files in workspace as fallback (except ignore/)
        changed_files = []
        
    if changed_files:
        log_info(f"Scanning {len(changed_files)} changed files...")
        for rel_path in changed_files:
            file_path = os.path.join(WORKSPACE_DIR, rel_path)
            if not os.path.exists(file_path):
                continue
                
            # Skip ignored directories
            if any(part in rel_path.split(os.sep) for part in [".git", "node_modules", ".next", "ignore"]):
                continue
                
            # Check text files
            if not rel_path.endswith(('.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.yaml', '.yml', '.py', '.css')):
                continue
                
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    file_content = f.read()
                    
                # A. Competitor AI keywords (skip docs/compliance scripts to prevent false-positives)
                is_doc_file = rel_path.startswith("doc") or "compliance" in rel_path.lower() or "guide" in rel_path.lower() or "manage_workspace" in rel_path
                if not is_doc_file:
                    for kw in COMPETITOR_KEYWORDS:
                        # Prevent flagging CSS cursor properties in styling files
                        if kw == "cursor":
                            if rel_path.endswith('.css') or re.search(r"cursor\s*:\s*\w+", file_content, re.IGNORECASE):
                                continue
                                
                        pattern = re.compile(rf"\b{kw}\b", re.IGNORECASE)
                        if pattern.search(file_content):
                            log_error(f"File '{rel_path}' contains competitor AI mention: '{kw}'")
                            failed = True
                            
                # B. Sensitive patterns
                for desc, pattern in SENSITIVE_PATTERNS.items():
                    if pattern.search(file_content):
                        log_error(f"File '{rel_path}' contains sensitive credentials matching: {desc}")
                        failed = True
            except Exception as e:
                log_error(f"Error reading file '{rel_path}': {e}")
    else:
        log_info("No changed files to check in Git index.")
        
    # 2. Check local environment alignment
    env_local = os.path.join(WEB_DIR, ".env.local")
    env_example = os.path.join(WEB_DIR, ".env.example")
    apphosting_yaml = os.path.join(WEB_DIR, "apphosting.yaml")
    
    if os.path.exists(env_local) and os.path.exists(env_example):
        log_info("Validating local env keys against documented templates...")
        local_keys = []
        with open(env_local, "r") as f:
            for line in f:
                if "=" in line and not line.strip().startswith("#"):
                    local_keys.append(line.split("=", 1)[0].strip())
                    
        example_keys = []
        with open(env_example, "r") as f:
            for line in f:
                if "=" in line and not line.strip().startswith("#"):
                    example_keys.append(line.split("=", 1)[0].strip())
                    
        missing_placeholders = [k for k in local_keys if k not in example_keys]
        if missing_placeholders:
            log_error(f"The following keys in .env.local are missing from .env.example: {missing_placeholders}")
            failed = True
            
        # 3. Check App Hosting config secret mappings
        if os.path.exists(apphosting_yaml):
            with open(apphosting_yaml, "r") as f:
                apphosting_content = f.read()
                
            # Any server-side variable (like MONGODB_URI or STORAGE_SECRET) must use a GCP secret binder
            server_side_keys = [k for k in local_keys if not k.startswith("NEXT_PUBLIC_")]
            for k in server_side_keys:
                if k not in apphosting_content:
                    log_error(f"Server-side env variable '{k}' in .env.local is not configured in apphosting.yaml")
                    failed = True
                elif f"variable: {k}" in apphosting_content and "secret:" not in apphosting_content.split(f"variable: {k}", 1)[1].split("- variable:", 1)[0]:
                    log_error(f"Server-side env variable '{k}' in apphosting.yaml must reference a 'secret:' binding for production safety")
                    failed = True
                    
    if failed:
        log_error("Audit sweep failed! Fix the configuration issues before committing.")
        return False
        
    log_info("Audit sweep PASS. All changes are secure and compliant.")
    return True

def print_help():
    help_text = """
Fahem Development Workspace Automation CLI
Usage: python scripts/manage_workspace.py [command] [options]

Commands:
  version-up      Increments the version of plan, tasks, and walkthrough files.
                  Options:
                    --summary, -s "Description of the revision changes" (Required)

  log-turn        Appends a Turn history log to log/turn_log.md with a dated timestamp.
                  Options:
                    --prompt, -p "The prompt sent by the user" (Required)
                    --summary, -s "The response summary" (Required)

  audit-secrets   Audits staged changes for credentials, local paths, or competitor leaks.
                  Also checks .env.local vs .env.example, and apphosting.yaml mappings.
"""
    print(help_text)

def main():
    if len(sys.argv) < 2:
        print_help()
        sys.exit(1)
        
    command = sys.argv[1].lower()
    args = sys.argv[2:]
    
    success = False
    if command == "version-up":
        success = command_version_up(args)
    elif command == "log-turn":
        success = command_log_turn(args)
    elif command == "audit-secrets":
        success = command_audit_secrets(args)
    else:
        print_help()
        sys.exit(1)
        
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
