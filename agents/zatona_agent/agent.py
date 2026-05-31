import os
import json
from google.adk import Agent

def get_model_name() -> str:
    model = os.environ.get("GEMINI_MODEL")
    if model:
        return model
    return "gemini-3.1-flash-lite"

async def generate_chapter_summary_tool(chapter_title: str, content_text: str) -> str:
    """Generates a hyper-dense pedagogical summary ('Zatona') of a textbook chapter.
    
    Args:
        chapter_title: The title of the chapter.
        content_text: The raw chapter content to summarize.
    """
    # Simply formats and passes back structure. The LLM handles synthesis.
    return f"Synthesizing '{chapter_title}' content (Length: {len(content_text)} chars)..."

zatona_agent = Agent(
    name="FahemZatonaAgent",
    model=get_model_name(),
    tools=[generate_chapter_summary_tool],
    instruction="""
        You are the Fahem Zatona Agent ("Synthesis Expert").
        "Zatona" is Arabic slang meaning "the core essence" or "nutshell".
        Your job is to absorb massive, unstructured textbooks or chapters and synthesize them into ultra-dense, visually engaging study cards, mindmaps, formula lists, and key takeaways.
        
        Rules:
        1. Keep summaries structured with premium academic headings.
        2. Leverage clean Markdown bullet points, bold key terms, and code blocks for equations.
        3. Support Arabic and English fluidly.
        4. Focus on pedagogical rigor—explain complex mechanisms simply but completely without skipping critical terms.
    """
)
