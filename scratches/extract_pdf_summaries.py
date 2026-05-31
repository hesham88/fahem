import os
import pypdf

doc_dir = r"C:\Users\hesh1\Desktop\fahem\doc"
output_dir = r"C:\Users\hesh1\Desktop\fahem\scratches"
os.makedirs(output_dir, exist_ok=True)

pdf_files = [
    "Architecting AI Agents with Google ADK_ A Comprehensive Guide.pdf",
    "ADK Agent Production Readiness Framework_ From Prototype to Enterprise Operations.pdf",
    "The Architect’s Guide to AI Agent Memory_ From Moments to Milestones.pdf",
    "The ADK Orchestration Primer_ Designing Collaborative AI Teams.pdf",
    "Architectural Design Document_ Complex Multi-Agent Orchestration System.pdf"
]

for pdf_name in pdf_files:
    pdf_path = os.path.join(doc_dir, pdf_name)
    txt_name = pdf_name.replace(".pdf", ".txt")
    txt_path = os.path.join(output_dir, txt_name)
    
    if os.path.exists(pdf_path):
        print(f"Parsing: {pdf_name}")
        try:
            reader = pypdf.PdfReader(pdf_path)
            text_pages = []
            for idx, page in enumerate(reader.pages):
                text_pages.append(f"--- PAGE {idx+1} ---\n" + (page.extract_text() or ""))
            
            full_text = "\n\n".join(text_pages)
            with open(txt_path, "w", encoding="utf-8") as f:
                with open(txt_path, "w", encoding="utf-8") as f:
                    f.write(full_text)
            print(f"Extracted {len(reader.pages)} pages to {txt_name} ({len(full_text)} chars)")
        except Exception as e:
            print(f"Error parsing {pdf_name}: {e}")
    else:
        print(f"Not found: {pdf_path}")
