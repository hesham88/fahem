import os
import json
from typing import Any
from google.adk import Agent

def get_model_name() -> str:
    """Resolves model name dynamically based on environment or configuration."""
    model = os.environ.get("GEMINI_MODEL")
    if model:
        return model
    return "gemini-3.1-flash-lite"

# Import database utilities from central agent communications
try:
    from agent_communications import check_username_availability, save_user_profile
except ImportError:
    try:
        from agents.agent_communications import check_username_availability, save_user_profile
    except ImportError:
        async def check_username_availability(username, exclude_user_id=None):
            return True
        async def save_user_profile(user_id, data):
            return True

# -------------------------------------------------------------
# Onboarding Agent Specific Tools (Skills)
# -------------------------------------------------------------

async def check_username_availability_tool(username: str) -> bool:
    """Checks if a username is available in the database. Returns True if available (not taken), False if already taken."""
    return await check_username_availability(username)

async def save_user_profile_tool(user_id: str, profile_data_json: str) -> str:
    """Saves or updates the user profile in MongoDB.
    Call this tool once all required onboarding fields have been collected and verified.
    
    Args:
        user_id: The unique user identifier.
        profile_data_json: A JSON string containing the profile fields to save. Example:
            {
                "username": "jane_doe",
                "email": "jane@example.com",
                "name": "Jane Doe",
                "role": "student",
                "age": 15,
                "country": "Egypt",
                "grade": "Grade 9",
                "school": "Maadi School",
                "onboardingCompleted": true
            }
    """
    try:
        data = json.loads(profile_data_json)
        data["userId"] = user_id
        if "onboardingCompleted" not in data:
            data["onboardingCompleted"] = True
        success = await save_user_profile(user_id, data)
        if success:
            return "SUCCESS: Profile saved successfully. Onboarding is complete."
        return "ERROR: Failed to save user profile."
    except Exception as e:
        return f"ERROR: {str(e)}"

async def search_schools_tool(query: str) -> str:
    """Searches for common schools matching the search query.
    
    Args:
        query: The search term.
    """
    schools = [
        "Cairo American College", "British International School in Cairo",
        "Maadi British International School", "New Cairo British International School",
        "International School of Choueifat", "American International School in Egypt",
        "Deutsche Schule der Borromäerinnen", "Lycée Français du Caire",
        "Harvard University", "Stanford University", "MIT", "Oxford University", "Cambridge University"
    ]
    filtered = [s for s in schools if query.lower() in s.lower()]
    return json.dumps(filtered[:5], ensure_ascii=False)

# Define the Onboarding Agent
onboarding_agent = Agent(
    name="FahemOnboardingAgent",
    model=get_model_name(),
    instruction="""
        You are the Fahem Conversational Onboarding Assistant.
        Your sole goal is to naturally, warmly, and politely onboard a new user into the Fahem platform.
        You support both English and Arabic. Respond in the language used by the user.
        
        Ensure you gather the following fields:
        1. Role / User Type: Must be "student", "teacher", "parent", or "admin". Explain what each does if asked.
        2. Full Name: Smartly extract the actual name (e.g. remove polite prefixes like "My name is", "اسمي هو", "انا").
        3. Username: Ask for a unique username (e.g. jane_doe). It must be at least 3 chars and alphanumeric/underscores.
           - CRITICAL: You MUST verify username availability by calling 'check_username_availability_tool' before proceeding! If taken, suggest alternatives or ask for another.
        4. Age: Ask for their age.
           - CRITICAL: Enforce common-sense human age limits (3 to 120 years). If a user provides an invalid age (e.g. 0, 1, 2, or > 120), politely ask for a realistic age.
           - If they are a "student" and age < 13: You MUST ask for their parent's email address.
        5. Country: Ask for their country.
        6. Educational Grade Level: (Only if they are a "student").
           - Offer a recommended grade based on their age and country, or let them specify a custom grade, select lifelong learning, or skip.
        7. School Name: (Only if "student" or "teacher"). Ask for their school. You can suggest common ones or let them type.
        8. Children Count & Children in School Count: (Only if "parent" or "teacher"). Ask how many children they have, and how many are in school.
        
        IMPORTANT RULES:
        - Converse naturally. Do not ask for all fields at once! Ask for 1 or 2 fields at a time to keep it a premium, conversational experience.
        - DO NOT disclose any internal database schemas, collections, or technical metrics. You are a conversational counselor, not a database administrator!
        - If the user asks "what can you do?" or other general questions, politely explain your role as an onboarding assistant here to guide them through setting up their custom space, explaining clearly what fields you need to collect.
        - When all required fields are collected and validated, call 'save_user_profile_tool' with the user's ID and all fields in the JSON payload!
        - Ensure 'onboardingCompleted' is set to True in the payload.
        - Once the save tool reports success, output a final welcoming message telling the user their profile is ready and onboarding is complete.
        - CRITICAL: Include the exact phrase "SUCCESS_ONBOARDING_COMPLETE" in your final response once the profile has been successfully saved.
    """,
    tools=[
        check_username_availability_tool,
        save_user_profile_tool,
        search_schools_tool
    ]
)

# Expose as app for compatibility
app = onboarding_agent

