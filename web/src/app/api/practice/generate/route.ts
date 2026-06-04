import { NextRequest } from "next/server";
import { isLocalEnv, getLocalDb } from "../../localDbHelper";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, bookId, mode, language } = body;

    const resolvedLanguage = language === "ar" ? "ar" : "en";
    const resolvedMode = mode || "mcq";
    const resolvedSubject = subject || "General";

    // 1. Resolve grounding context from real book pages if bookId is provided
    let contextText = "";
    if (bookId) {
      if (isLocalEnv()) {
        const db = getLocalDb();
        const pages = (db as any).book_pages || [];
        const bookPages = pages.filter((p: any) => p.book_id === bookId);
        if (bookPages.length > 0) {
          // Select 2 random pages to generate a question
          const selectedPages = bookPages.sort(() => 0.5 - Math.random()).slice(0, 2);
          contextText = selectedPages.map((p: any) => `[Page ${p.page_number}]:\n${p.content}`).join("\n\n");
        }
      } else {
        // Production: We can call MongoDB or the agent directly to get pages.
        // Let's call the proxy agent
        try {
          const { proxyRequest } = require("../../proxy");
          const res = await proxyRequest(`/user/books/pages?book_id=${bookId}`, "GET");
          if (res.ok) {
            const data = await res.json();
            if (data && data.pages && data.pages.length > 0) {
              const selectedPages = data.pages.sort(() => 0.5 - Math.random()).slice(0, 2);
              contextText = selectedPages.map((p: any) => `[Page ${p.page_number}]:\n${p.content}`).join("\n\n");
            }
          }
        } catch (err) {
          console.error("[generate-practice] Failed to get pages from proxy:", err);
        }
      }
    }

    // 2. Fallback static content for grounding if no pages exist
    if (!contextText) {
      if (resolvedSubject === "Math") {
        contextText = "Topic: Matrices, determinants, Cramer's rule, and linear systems.";
      } else if (resolvedSubject === "Science") {
        contextText = "Topic: Gases and thermodynamics (Ideal gas law, Boyle's law, Charles's law, heat, work, internal energy, laws of thermodynamics, molecular kinetics, pressure and temperature).";
      } else if (resolvedSubject === "Arabic") {
        contextText = "Topic: Arabic grammar, parsing (إعراب), nominative/accusative/genitive states, and parts of speech.";
      } else {
        contextText = "Topic: General academic curriculum subjects.";
      }
    }

    // 3. Build AI Prompt
    const prompt = `
You are the ultimate gamified AI Practice Tutor for the Fahem platform.
Your task is to generate a premium quality, highly engaging learning question for a student.

Practice Config:
- Subject: ${resolvedSubject}
- Mode: ${resolvedMode} (must be one of: mcq, text, oral)
- Language: ${resolvedLanguage === "ar" ? "Arabic" : "English"}
- Grounding context / source material:
${contextText}

Instructions for Question Types:
- If Mode is "mcq": Generate a multiple-choice question. Provide exactly 4 diverse options. Mark one as correct.
- If Mode is "text": Generate an active recall question requiring a written sentence or paragraph answer. Options and correctOption are not required.
- If Mode is "oral": Generate a speech/pronunciation/oral explanation task (e.g. "Explain why...", "Pronounce or recite...", "Deliver a summary of...").

Gamification Tone:
Make the question feel like a quest or video game challenge. Use emojis. Keep it fun and pedagogically sound.

You MUST respond with a JSON object strictly matching this schema:
{
  "question": "The challenge / question text",
  "options": ["Option A", "Option B", "Option C", "Option D"], // Only for mcq mode, otherwise empty array []
  "correctOption": "The exact string matching the correct option", // Only for mcq mode, otherwise empty string ""
  "hint": "A gamified, helpful hint or clue"
}
`;

    // 4. Call Gemini API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "Gemini API key is not configured" }), { status: 500 });
    }

    const isOral = resolvedMode === "oral";
    const modelName = isOral ? "gemini-3.1-flash-live-preview" : (process.env.GEMINI_MODEL || "gemini-3.1-flash-lite");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Gemini API error: ${response.status} - ${errorText}` }), { status: response.status });
    }

    const resJson = await response.json();
    const responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      return new Response(JSON.stringify({ error: "Empty response from Gemini" }), { status: 500 });
    }

    const questionData = JSON.parse(responseText.trim());
    return new Response(JSON.stringify({ success: true, ...questionData }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[api-practice-generate] Failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
