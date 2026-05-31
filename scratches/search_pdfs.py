import os
import sys

scratches_dir = r"C:\Users\hesh1\Desktop\fahem\scratches"
files = [
    "ADK Agent Production Readiness Framework_ From Prototype to Enterprise Operations.txt",
    "Architecting AI Agents with Google ADK_ A Comprehensive Guide.txt",
    "Architectural Design Document_ Complex Multi-Agent Orchestration System.txt",
    "The ADK Orchestration Primer_ Designing Collaborative AI Teams.txt",
    "The Architect’s Guide to AI Agent Memory_ From Moments to Milestones.txt"
]

keywords = [
    "memory", "session", "preload", "database", "mongodb", "vertex",
    "critique", "workflow", "loop", "evaluation", "eval", "cli", "prompt", "gate",
    "coordinator", "companion", "structure", "orchestrator", "subject", "book", "page"
]

# Configure sys.stdout to output utf-8
sys.stdout.reconfigure(encoding='utf-8')

for name in files:
    path = os.path.join(scratches_dir, name)
    if os.path.exists(path):
        print(f"\n=====================================")
        print(f"KEYWORD MATCHES IN: {name}")
        print(f"=====================================")
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
        
        # split by paragraphs or double newlines
        paragraphs = text.split("\n\n")
        match_count = 0
        for p in paragraphs:
            p_clean = p.strip().replace("\n", " ")
            if not p_clean:
                continue
            matched_keys = [k for k in keywords if k.lower() in p_clean.lower()]
            if len(matched_keys) >= 2: # match paragraphs with at least 2 keywords for dense context
                out_line = f"- [{', '.join(matched_keys)}]: {p_clean[:300]}..."
                print(out_line.encode(sys.stdout.encoding or 'utf-8', errors='replace').decode(sys.stdout.encoding or 'utf-8'))
                match_count += 1
                if match_count > 10:
                    print("... (truncated matching paragraphs)")
                    break
