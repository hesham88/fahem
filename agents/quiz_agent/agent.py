import os
import json
import concurrent.futures
from typing import List, Dict, Any
from google.adk import Agent

def get_model_name() -> str:
    model = os.environ.get("GEMINI_MODEL")
    if model:
        return model
    return "gemini-3.1-flash-lite"

def fetch_single_chapter_questions(chapter_id: str, chapter_title: str) -> Dict[str, Any]:
    """Simulates or fetches customized questions for a specific chapter in parallel threads."""
    print(f"[Thread Fanout] Generating questions for Chapter: {chapter_title} ({chapter_id})")
    # Simulate a high-quality educational MCQ payload
    return {
        "chapter_id": chapter_id,
        "chapter_title": chapter_title,
        "questions": [
            {
                "question": f"Which concept is most fundamental to {chapter_title}?",
                "options": ["Concept A", "Concept B", "Concept C", "Concept D"],
                "answer": "Concept A",
                "explanation": f"Concept A is the core foundational mechanism of {chapter_title}."
            },
            {
                "question": f"Identify the primary application of {chapter_title}:",
                "options": ["Application X", "Application Y", "Application Z", "None of the above"],
                "answer": "Application X",
                "explanation": f"Application X represents the main application profile of {chapter_title}."
            }
        ]
    }

async def generate_parallel_chapter_quizzes(chapters_json: str) -> str:
    """Concurrently generates quizzes for multiple textbook chapters in parallel using ThreadPoolExecutor.
    
    Args:
        chapters_json: A JSON array of chapters with 'id' and 'title'. Example:
            '[{"id": "ch_1", "title": "Linear Algebra"}, {"id": "ch_2", "title": "Calculus"}]'
    """
    try:
        chapters = json.loads(chapters_json)
    except Exception as e:
        return f"ERROR: Invalid chapters JSON: {str(e)}"
        
    results = []
    # Concurrently execute queries in parallel to satisfy the Parallel Engine Pattern
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, len(chapters))) as executor:
        future_to_chapter = {
            executor.submit(fetch_single_chapter_questions, ch.get("id", "ch_unknown"), ch.get("title", "Unknown Chapter")): ch 
            for ch in chapters
        }
        for future in concurrent.futures.as_completed(future_to_chapter):
            ch_data = future_to_chapter[future]
            try:
                data = future.result()
                results.append(data)
            except Exception as exc:
                print(f"[Thread Error] {ch_data.get('title')} generated exception: {exc}")
                
    return json.dumps(results, ensure_ascii=False)

quiz_agent = Agent(
    name="FahemQuizAgent",
    model=get_model_name(),
    tools=[generate_parallel_chapter_quizzes],
    instruction="""
        You are the Fahem Quiz Agent ("Parallel Quiz Engine").
        Your job is to generate balanced, curriculums-aligned quizzes (MCQ or Open text practice questions) by querying multiple chapters concurrently.
        You must leverage the 'generate_parallel_chapter_quizzes' tool to fan out chapter requests in parallel.
        Once the fanned-out questions are retrieved, merge and synthesize them into a beautiful, cohesive, and pedagogical exam paper.
        
        Rules:
        1. Ensure diverse question complexities (beginner, intermediate, advanced).
        2. Format quizzes beautifully using Markdown tables or list formatting.
        3. Localize output seamlessly into Arabic or English matching the student's request.
    """
)
