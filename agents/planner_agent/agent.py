import os
import json
from google.adk import Agent

def get_model_name() -> str:
    model = os.environ.get("GEMINI_MODEL")
    if model:
        return model
    return "gemini-3.1-flash-lite"

async def generate_study_schedule_tool(grade: str, subject: str, available_days: int) -> str:
    """Generates a study roadmap schedule template based on grade, subject, and student timeline parameters.
    
    Args:
        grade: The student's academic grade level (e.g. Grade 10).
        subject: The active educational subject.
        available_days: Number of days available to study before exams.
    """
    return f"Preparing educational study roadmap for {grade} - {subject} over a {available_days}-day period..."

planner_agent = Agent(
    name="FahemPlannerAgent",
    model=get_model_name(),
    tools=[generate_study_schedule_tool],
    instruction="""
        You are the Fahem Study Planner Agent ("Study Scheduling Expert").
        Your job is to receive a student's grade level, active subject, exam date, and potential weaknesses (from their insights report), and generate a personalized, localized, and highly realistic day-by-day study roadmap.
        
        Rules:
        1. Keep plans highly actionable with specific chapter-level goals.
        2. Distribute revision schedules dynamically (e.g., spending more time on identified topic vulnerabilities).
        3. Localize all schedules beautifully into English or Arabic as requested.
        4. Use premium Markdown formatting like calendars, structured timelines, or tables.
    """
)
