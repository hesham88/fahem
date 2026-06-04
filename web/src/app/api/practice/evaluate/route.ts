import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, mode, userAnswer, correctOption, language } = body;

    const resolvedLanguage = language === "ar" ? "ar" : "en";
    const resolvedMode = mode || "mcq";

    // Build Evaluation AI Prompt
    const prompt = `
You are the ultimate gamified AI Practice Tutor for the Fahem platform.
Your task is to evaluate the user's answer to a learning challenge and return a gamified response.

Challenge Details:
- Question: "${question}"
- Mode: ${resolvedMode} (one of: mcq, text, oral)
- User's Answer: "${userAnswer}"
${resolvedMode === "mcq" ? `- Expected Correct Option: "${correctOption}"` : ""}
- Language: ${resolvedLanguage === "ar" ? "Arabic" : "English"}

Evaluation Rules:
1. If mode is "mcq":
   - Compare "User's Answer" with "Expected Correct Option". Programmatically or semantically, if they refer to the same choice, set isCorrect to true.
   - If correct, award 15-25 XP.
   - If incorrect, award 0 XP.

2. If mode is "text":
   - Assess the "User's Answer" for correctness, context, and quality against the "Question".
   - If it is accurate and shows good understanding, set isCorrect to true, and award 20-30 XP based on the depth/accuracy of the response.
   - If it is partially correct, set isCorrect to true (or false if too inaccurate) and award 5-15 XP.
   - If it is incorrect or completely irrelevant, set isCorrect to false, and award 0 XP.

3. If mode is "oral":
   - Assess the transcribed "User's Answer" against the "Question" (often focused on scientific topics like gases/thermodynamics).
   - Rate the response across 5 dimensions: Pronunciation, Confidence, Accuracy, Structure, and Overall % (all scores out of 100).
   - CRITICAL (Egyptian Arabic Accent Normalization): If the user responds in Arabic, you MUST apply Egyptian Arabic accent normalization. Do NOT penalize typical Egyptian dialect pronunciations. For example, pronouncing 'ج' as a hard 'g' /g/, 'ق' as a glottal stop / hamza 'أ' or 'ء', 'ث' as 'س' or 'ت', and 'ذ' as 'ز' or 'د' must be treated as perfectly correct.
   - Set isCorrect to true if Overall % is 60 or higher. Award 20-35 XP proportional to performance.

Gamification & Tone:
- Provide high-energy, gaming-style feedback (e.g., "Critical Hit! 🎯", "Quest Completed!", "Deflected! 🛡️ Try again", "Level Up!").
- Keep it fun, interactive, and encouraging. Use emojis!
- Respond in the requested Language (${resolvedLanguage === "ar" ? "Arabic" : "English"}).

You MUST respond with a JSON object strictly matching this schema:
{
  "isCorrect": boolean,
  "xpGained": number,
  "feedback": "Gamified feedback with emojis",
  "correctExplanation": "A clear, pedagogical explanation of the correct answer or how to improve",
  "rubric": {
    "overall": number,
    "pronunciation": number,
    "confidence": number,
    "accuracy": number,
    "structure": number,
    "accentNormalizationApplied": boolean,
    "feedbackDetails": {
      "pronunciationFeedback": "feedback in Arabic/English",
      "confidenceFeedback": "feedback in Arabic/English",
      "accuracyFeedback": "feedback in Arabic/English",
      "structureFeedback": "feedback in Arabic/English"
    }
  }
} (For 'mcq' and 'text' modes, you can set 'rubric' to null or omit it, but for 'oral' mode it must be populated).
`;

    // Call Gemini API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "Gemini API key is not configured" }), { status: 500 });
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
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

    const evaluationData = JSON.parse(responseText.trim());
    return new Response(JSON.stringify({ success: true, ...evaluationData }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[api-practice-evaluate] Failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
