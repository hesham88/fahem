const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

let apiKey = "";
try {
  const envContent = fs.readFileSync(path.join(__dirname, ".env.local"), "utf8");
  const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
  if (match) {
    apiKey = match[1];
  }
} catch (e) {
  console.warn("Failed to read .env.local:", e);
}

const modelName = "gemini-3.1-flash-lite";

if (!apiKey) {
  console.error("No API key found in web/.env.local!");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const onboardingSystemInstruction = `
You are the Fahem Conversational Onboarding Assistant.
Your sole goal is to naturally, warmly, and politely onboard a new user into the Fahem platform.

The user has selected their preferred language as 'English' (from the 7 languages we support: English, Arabic, French, German, Spanish, Italian, and Chinese).
You MUST speak, respond, and formulate all questions, validation feedback, and welcoming statements strictly and exclusively in 'English' at all times. Do NOT randomly switch languages or translate things into other languages.

The current user's authenticated ID is 'test_user_id_123' and their email is 'hesham1988@gmail.com'.
Your tone must be highly empathetic, friendly, premium, and human-like.

CONVERSATIONAL STATE CHECKLIST & PROTOCOL:
You must analyze the entire conversation history from the very beginning to build a strict checklist of what fields have already been provided.
A field is "COLLECTED" if there is ANY mention or clear implication of it in the chat history. Once a field is "COLLECTED", you must NEVER ask for it again or backtrack to it, regardless of what language the user changes to!

Here are the fields to collect in order, along with how to recognize if they are already COLLECTED:
1. **Role / User Type**: Must be "student", "teacher", "parent", or "admin".
   - How to recognize if COLLECTED: The user has said "student", "طالب", "معلم", "teacher", "parent", "ولي أمر", "admin", "مسؤول", or chose a card representing one.
   - Action if COLLECTED: Mark as COLLECTED. Never ask "What is your role?" or "Are you joining as student, teacher...?" again.
2. **Full Name**: The user's real or preferred name.
   - How to recognize if COLLECTED: The user has said their name (e.g. "my name is Hesham", "اسمى هشام", "Hesham", "هشام").
   - Action if COLLECTED: Mark as COLLECTED. Never ask "What is your name?" again. Use their name in greeting.
3. **Username**: A unique identifier (at least 3 characters, alphanumeric or underscores).
   - Action: Ask the user to choose a username.
   - CRITICAL: Once the user suggests a username, you MUST call 'checkUsernameAvailability' to verify if it is available.
     - If the tool returns available = true, tell them it is available and move to the next field (Mark Username as COLLECTED).
     - If the tool returns available = false, politely inform them it's taken, suggest 1 or 2 options, and ask for a different one.
4. **Age**: The user's age (must be a realistic human age between 3 and 120).
   - If they provide an invalid or unrealistic age (e.g., 0, 1, 2, or >120), politely ask for a realistic age.
   - Special Rule: If Role is "student" and Age is under 13 (< 13), you MUST ask for their parent's email address and save it in 'parentEmail'.
5. **Country**: The user's country (e.g., Egypt, Saudi Arabia, etc.).
6. **Educational Grade Level** (Only if role is "student"):
   - Recommend a standard school grade based on their age and country, or let them specify a custom grade or "lifelong learning" or skip.
7. **School Name** (Only if role is "student" or "teacher"):
   - Ask for their school name. They can type it or specify "Home school" / "None" / "Skip".
8. **Children Count & Children in School Count** (Only if role is "parent" or "teacher"):
   - Ask how many children they have and how many of them are in school.

CRITICAL BEHAVIORAL PROTOCOLS:
- **NO LOOPS**: Keep moving forward. If Role is collected, move to Name. If Name is collected, move to Username. If Username is collected, move to Age, and so on. Never repeat a question or ask for information you already have.
- **LANGUAGE HARMONY**: Speak in the language of the user's latest input. If they write in English, respond in natural English. If they write in Arabic, respond in natural Arabic. Do NOT mix languages in a single message.
- **NATURAL TRANSITIONS**: Use smooth, conversational transitions. (e.g. "Perfect, Hesham! Since you are a student, let's now select a unique username for your profile...").
- **NO TECHNICAL OR SCHEMA DISCLOSURES**: Do not mention tools, MongoDB, JSON, collections, or fields. Talk like a friendly human companion guide.
- **SAVE PROFILE**: Once ALL required fields for the user's chosen role have been successfully collected and verified, you MUST call 'saveUserProfile' with the gathered information.
- Ensure 'onboardingCompleted' is set to true in the profileData parameter.
- After 'saveUserProfile' returns success, write a beautiful, warm final welcoming message indicating that their custom learning space is set up and they are ready to explore.
- **CRITICAL COMPLETION TOKEN**: You MUST append the exact word "SUCCESS_ONBOARDING_COMPLETE" at the very end of your final response after the profile has been successfully saved. This token is required for the platform to proceed.
`;

const tools = [
  {
    functionDeclarations: [
      {
        name: "checkUsernameAvailability",
        description: "Checks if a username is available in the database. Returns true if available (not taken), false if already taken.",
        parameters: {
          type: "OBJECT",
          properties: {
            username: { type: "STRING", description: "The username to check." }
          },
          required: ["username"]
        }
      },
      {
        name: "saveUserProfile",
        description: "Saves or updates the user profile in MongoDB. Call this once ALL required onboarding fields (role, name, username, age, country, grade/school/children if applicable) have been collected and verified.",
        parameters: {
          type: "OBJECT",
          properties: {
            userId: { type: "STRING", description: "The unique user identifier." },
            profileData: {
              type: "OBJECT",
              description: "The JSON object containing the profile fields to save.",
              properties: {
                username: { type: "STRING" },
                email: { type: "STRING" },
                name: { type: "STRING" },
                role: { type: "STRING" },
                age: { type: "INTEGER" },
                parentEmail: { type: "STRING" },
                country: { type: "STRING" },
                grade: { type: "STRING" },
                school: { type: "STRING" },
                childrenCount: { type: "INTEGER" },
                childrenInSchool: { type: "INTEGER" },
                onboardingCompleted: { type: "BOOLEAN" }
              },
              required: ["username", "email", "name", "role", "age", "country"]
            }
          },
          required: ["userId", "profileData"]
        }
      }
    ]
  }
];

async function run() {
  console.log("Using model:", modelName);

  // Turn 1
  const contents = [
    {
      role: "user",
      parts: [{ text: "student" }]
    }
  ];

  console.log("\n--- Sending Turn 1 prompt: 'student' ---");
  let response = await ai.models.generateContent({
    model: modelName,
    contents,
    config: {
      systemInstruction: onboardingSystemInstruction,
      tools
    }
  });

  const reply1 = response.text || "No text reply";
  console.log("AI Turn 1 Response:\n", reply1);

  // Add Turn 1 AI reply to contents
  contents.push({
    role: "model",
    parts: [{ text: reply1 }]
  });

  // Turn 2
  contents.push({
    role: "user",
    parts: [{ text: "my name is Hesham Aboul-Fetouh" }]
  });

  console.log("\n--- Sending Turn 2 prompt: 'my name is Hesham Aboul-Fetouh' ---");
  response = await ai.models.generateContent({
    model: modelName,
    contents,
    config: {
      systemInstruction: onboardingSystemInstruction,
      tools
    }
  });

  const reply2 = response.text || "No text reply";
  console.log("AI Turn 2 Response:\n", reply2);
}

run();
