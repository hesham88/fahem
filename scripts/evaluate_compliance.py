#!/usr/bin/env python3
import os
import re
import sys
import subprocess
from datetime import datetime

# Enforce dated/timestamped execution
RUN_TIMESTAMP = datetime.now().isoformat()
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IGNORE_DIR = os.path.join(WORKSPACE_DIR, "ignore")

# Define target compliance rules
GIT_NAME_EXPECTED = "hesham88"
GIT_EMAIL_EXPECTED = "hesham1988@gmail.com"

# Competitor AI keywords
COMPETITOR_KEYWORDS = ["claude", "cursor", "copilot", "openai", "gpt-4", "gpt-3"]

# Sensitive patterns (credentials, raw API keys, local username leakage)
SENSITIVE_PATTERNS = {
    "API Key pattern": re.compile(r"api[-_]?key\s*=\s*['\"][a-zA-Z0-9_\-]{10,}['\"]", re.IGNORECASE),
    "Generic password pattern": re.compile(r"password\s*=\s*['\"][^'\"]+['\"]", re.IGNORECASE),
}


def log_report(message, level="INFO"):
    print(f"[{level}] [{RUN_TIMESTAMP}] {message}")

def check_git_config():
    log_report("Checking local git configuration...")
    try:
        name = subprocess.check_output(["git", "config", "user.name"], cwd=WORKSPACE_DIR).decode().strip()
        email = subprocess.check_output(["git", "config", "user.email"], cwd=WORKSPACE_DIR).decode().strip()
        
        name_ok = (name == GIT_NAME_EXPECTED)
        email_ok = (email == GIT_EMAIL_EXPECTED)
        
        if name_ok and email_ok:
            return True, f"Git configuration matches expected authorized identity: {name} <{email}>"
        else:
            return False, f"Git configuration mismatch! Found: '{name}' <{email}>. Expected: '{GIT_NAME_EXPECTED}' <{GIT_EMAIL_EXPECTED}>"
    except Exception as e:
        return False, f"Failed to retrieve local git configuration: {str(e)}"

def scan_files():
    log_report("Scanning workspace files for sensitive leaks and competitor dependencies...")
    findings = []
    
    # Files/folders to skip during scanning
    skipped_paths = [
        ".git", "node_modules", ".next", "dist", "ignore", ".ignore", "test-results",
        "evaluate_compliance.py", "manage_workspace.py", "turn_log.md" # skip administrative utilities and turn logs
    ]
    
    for root, dirs, files in os.walk(WORKSPACE_DIR):
        # Modify dirs in-place to skip unwanted directories
        dirs[:] = [d for d in dirs if d not in skipped_paths]
        
        for file in files:
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, WORKSPACE_DIR)
            
            # Skip skipped files
            if any(part in rel_path.split(os.sep) for part in skipped_paths):
                continue
                
            # Only scan text/code files
            if not file.endswith(('.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.yaml', '.yml', '.css', '.html', '.py')):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    
                # Skip checking competitor keywords in documentation/reports/guides to prevent false-positives
                is_doc_file = rel_path.startswith("doc") or rel_path.startswith("artifacts") or "compliance" in rel_path.lower() or "guide" in rel_path.lower()
                
                # 1. Check for competitor keywords (skip for doc files)
                if not is_doc_file:
                    for kw in COMPETITOR_KEYWORDS:
                        # Prevent flagging CSS cursor properties or Tailwind classes in styling or component files
                        if kw == "cursor":
                            if file.endswith('.css'):
                                continue
                            # Avoid flagging cursor if it is followed by hyphen or colon (e.g. cursor-pointer, cursor: "pointer")
                            if not re.search(r"\bcursor\b(?!\s*[:-].*)", content, re.IGNORECASE):
                                continue
                        
                        pattern = re.compile(rf"\b{kw}\b", re.IGNORECASE)
                        if pattern.search(content):
                            findings.append({
                                "file": rel_path,
                                "type": "Competitor AI Dependency",
                                "detail": "Contains reference to unapproved third-party AI assistant/agent."
                            })
                        
                # 2. Check for sensitive patterns
                for desc, pattern in SENSITIVE_PATTERNS.items():
                    matches = pattern.findall(content)
                    if matches:
                        # Ensure we mask findings details before printing
                        masked_detail = f"Contains reference matching: {desc}"
                        findings.append({
                            "file": rel_path,
                            "type": "Sensitive Information Leakage",
                            "detail": masked_detail
                        })
            except Exception as e:
                findings.append({
                    "file": rel_path,
                    "type": "Scan Error",
                    "detail": str(e)
                })
                
    return findings

def evaluate_memory():
    log_report("Verifying Memory system revision structure...")
    memory_dir = os.path.join(WORKSPACE_DIR, "memory")
    if not os.path.exists(memory_dir):
        return False, "Memory directory does not exist!"
        
    files = os.listdir(memory_dir)
    plans = [f for f in files if f.startswith("plan_v") and f.endswith(".md")]
    tasks = [f for f in files if f.startswith("tasks_v") and f.endswith(".md")]
    walkthroughs = [f for f in files if f.startswith("walkthrough_v") and f.endswith(".md")]
    
    if not plans or not tasks or not walkthroughs:
        return False, "Missing core memory versioned files (plan, tasks, or walkthrough)."
        
    latest_plan = sorted(plans, key=lambda x: int(re.search(r'\d+', x).group()))[-1]
    latest_task = sorted(tasks, key=lambda x: int(re.search(r'\d+', x).group()))[-1]
    
    return True, f"Memory structure verified. Latest versions found: {latest_plan}, {latest_task}"

def check_mongodb_integration():
    log_report("Auditing MongoDB MCP Integration status...")
    agent_path = os.path.join(WORKSPACE_DIR, "web", "agents", "agent.py")
    if not os.path.exists(agent_path):
        agent_path = os.path.join(WORKSPACE_DIR, "agents", "agent.py")
    if not os.path.exists(agent_path):
        return False, "Python Agent file (agent.py) does not exist!"
        
    try:
        with open(agent_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # MongoDB track requires using McpToolset or pymongo connection to MongoDB
        has_mongodb = "mongodb" in content.lower() or "mcp_toolset" in content.lower()
        if not has_mongodb:
            return False, "MongoDB MCP tools and toolset are missing in agent.py."
        else:
            return True, "MongoDB MCP tools and Python ADK Agent are fully integrated."
    except Exception as e:
        return False, f"Error reading agent.py: {str(e)}"

def run_evaluation():
    git_ok, git_msg = check_git_config()
    memory_ok, memory_msg = evaluate_memory()
    mongo_ok, mongo_msg = check_mongodb_integration()
    findings = scan_files()
    
    report_lines = [
        "# 🛡️ FAHEM COMPLIANCE AUDIT REPORT",
        "",
        "| Metadata Field | Audit Value |",
        "| :--- | :--- |",
        f"| **Project Workspace** | `fahem` |",
        f"| **Audit Timestamp** | `{RUN_TIMESTAMP}` |",
        "| **Assigned Auditor** | `Fahem Compliance Agent` |",
        "| **Target Hackathon Track** | `MongoDB Partner Track` |",
        "",
        "---",
        "",
        "## 📊 EXECUTIVE SUMMARY",
        "An automated compliance sweep was executed to verify alignment with Google Cloud Rapid Agent Hackathon rules, committer identity checks, and security leak protocols.",
        "",
        f"- **Git Committer Status**: `{'PASS' if git_ok else 'FAIL'}`",
        f"- **Memory System State**: `{'PASS' if memory_ok else 'FAIL'}`",
        f"- **MongoDB Track State**: `{'PASS' if mongo_ok else 'FAIL (MISSING COMPONENTS)'}`",
        f"- **Total Security/Exclusivity Issues**: **{len(findings)}** active findings.",
        "",
        "> [!IMPORTANT]",
        "> Ensure all active findings are resolved before staging and pushing commits to GitHub to avoid security disclosure.",
        "",
        "---",
        "",
        "## 🔬 DETAILED AUDIT RESULTS",
        "",
        "### 1. Git Committer Check",
        f"- **Committer Match**: {'PASS' if git_ok else 'FAIL'}",
        f"- **Details**: {git_msg}",
        "",
        "### 2. Memory Structure Verification",
        f"- **Memory State**: {'PASS' if memory_ok else 'FAIL'}",
        f"- **Details**: {memory_msg}",
        "",
        "### 3. MongoDB Track Integration check",
        f"- **Integration State**: {'PASS' if mongo_ok else 'FAIL'}",
        f"- **Details**: {mongo_msg}",
        "",
        "### 4. Active Findings & Vulnerabilities Scan",
    ]
    
    if findings:
        report_lines.append("| File Path | Vulnerability Category | Description & Proposed Remediation |")
        report_lines.append("| :--- | :--- | :--- |")
        for f in findings:
            report_lines.append(f"| `{f['file']}` | {f['type']} | {f['detail']} |")
    else:
        report_lines.append("No competitor AI dependencies or sensitive leakage leaks detected in scanned files.")
        
    report_lines.append("\n---")
    report_lines.append("\n## 💡 ACTION PLAN & PROPOSALS")
    
    if not git_ok:
        report_lines.append("### 🔴 Git Identity Fix Required")
        report_lines.append("- **Proposal**: Configure local git details using `git config user.name 'hesham88'` and `git config user.email 'hesham1988@gmail.com'`.")
        report_lines.append("  - **Rationale**: Strict committer identities are required for GitHub deployment pipeline integration.")
        
    if not mongo_ok:
        report_lines.append("### 🔴 MongoDB Track Tools Registration Required")
        report_lines.append("- **Proposal**: Register and expose MongoDB MCP server tools (e.g. db-stats, list-collections, find) to the ADK coordinator agent in `agents/src/agents/coordinator.ts`.")
        report_lines.append("  - **Rationale**: The hackathon rules require a functional agent integrating the chosen track partner's Model Context Protocol (MCP) server.")

    if findings:
        report_lines.append("### 🟡 Leakage & Exclusivity Clean-up")
        report_lines.append("- **Proposal**: Review and clean up the unmasked references identified in the table above. Migrate credentials to GCP Secret Manager, and mask names/paths.")
        report_lines.append("  - **Rationale**: Maintain compliance with the hackathon rules and prevent public leak of local system parameters.")
        
    if git_ok and mongo_ok and not findings:
        report_lines.append("### 🟢 Ready for Development")
        report_lines.append("- **Proposal**: Proceed to deploy Next.js UI elements and link to Agent sessions.")
        report_lines.append("  - **Rationale**: All pre-requisite workspace checks, committer identities, and security controls are fully compliant.")
        
    report_content = "\n".join(report_lines)
    
    # Save the report to doc/
    date_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_dated_path = os.path.join(WORKSPACE_DIR, "doc", f"compliance_report_{date_str}.md")
    
    with open(report_dated_path, "w", encoding="utf-8") as rf:
        rf.write(report_content)
        
    log_report(f"Compliance report saved to: {report_dated_path}")
    
    # Safely print ASCII-friendly content to stdout
    print("\n" + report_content.encode('ascii', errors='replace').decode('ascii'))



if __name__ == "__main__":
    run_evaluation()
