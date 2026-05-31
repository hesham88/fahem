import os

scratches_dir = r"C:\Users\hesh1\Desktop\fahem\scratches"
files = [
    "ADK Agent Production Readiness Framework_ From Prototype to Enterprise Operations.txt",
    "Architecting AI Agents with Google ADK_ A Comprehensive Guide.txt",
    "Architectural Design Document_ Complex Multi-Agent Orchestration System.txt",
    "The ADK Orchestration Primer_ Designing Collaborative AI Teams.txt",
    "The Architect’s Guide to AI Agent Memory_ From Moments to Milestones.txt"
]

for name in files:
    path = os.path.join(scratches_dir, name)
    if os.path.exists(path):
        print(f"\n=====================================")
        print(f"FILE: {name}")
        print(f"=====================================")
        with open(path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        # print non-empty lines that seem to be headers or code blocks
        line_count = 0
        for idx, line in enumerate(lines):
            clean = line.strip()
            if not clean:
                continue
            # if it starts with # or has all uppercase or PAGE
            if clean.startswith("#") or clean.startswith("--- PAGE") or (clean.isupper() and len(clean) > 5) or "class" in clean or "def " in clean or "@" in clean:
                print(f"L{idx+1}: {clean}")
                line_count += 1
                if line_count > 30:
                    print("... (truncated structural lines)")
                    break
