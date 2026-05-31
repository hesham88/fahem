import os
import re

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
        with open(path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        cleaned_lines = []
        current_chunk = []
        for line in lines:
            line_str = line.strip()
            if not line_str:
                if current_chunk:
                    cleaned_lines.append(" ".join(current_chunk))
                    current_chunk = []
                cleaned_lines.append("")  # preserve empty lines
            elif line_str.startswith("--- PAGE"):
                if current_chunk:
                    cleaned_lines.append(" ".join(current_chunk))
                    current_chunk = []
                cleaned_lines.append("")
                cleaned_lines.append(line_str)
                cleaned_lines.append("")
            else:
                current_chunk.append(line_str)
        
        if current_chunk:
            cleaned_lines.append(" ".join(current_chunk))
        
        # Merge consecutive empty lines
        final_text = "\n".join(cleaned_lines)
        final_text = re.sub(r'\n{3,}', '\n\n', final_text)
        
        with open(path, "w", encoding="utf-8") as f:
            f.write(final_text)
        print(f"Cleaned formatting for {name}")
