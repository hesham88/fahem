import { NextRequest } from "next/server";
import { requireUser } from "../../_auth";
import { proxyRequest } from "../../proxy";
import { isLocalEnv, getLocalDb } from "../../localDbHelper";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const { question, mode, userAnswer, correctOption, language, bookId, pageNumber } = body;

    const resolvedLanguage = language === "ar" ? "ar" : "en";
    const resolvedMode = mode || "mcq";

    // Grounded evaluation: load the book page if bookId and pageNumber are provided
    let page: any = null;
    let referenceFacts = "";
    if (bookId && pageNumber !== undefined) {
      if (isLocalEnv()) {
        try {
          const localDb = getLocalDb();
          const pages = (localDb as any).book_pages || [];
          page = pages.find(
            (p: any) =>
              (p.book_id === bookId || p.bookId === bookId) &&
              Number(p.page_number || p.pageNum || 0) === Number(pageNumber)
          );
        } catch (localErr) {
          console.error("[api-practice-evaluate] Failed to read local page:", localErr);
        }
      } else {
        try {
          const proxyRes = await proxyRequest(`/user/books/pages?book_id=${bookId}`, "GET");
          if (proxyRes.ok) {
            const data = await proxyRes.json();
            if (data && data.success && Array.isArray(data.pages)) {
              page = data.pages.find((p: any) => Number(p.page_number || p.pageNum || 0) === Number(pageNumber));
            }
          }
        } catch (err) {
          console.error("[api-practice-evaluate] Failed to fetch book pages via proxy:", err);
        }
      }
    }

    if (page) {
      if (page.blocks && Array.isArray(page.blocks)) {
        referenceFacts = page.blocks
          .map((b: any) => {
            const parts = [];
            if (b.title) parts.push(b.title);
            if (b.text) parts.push(b.text);
            if (b.term) parts.push(b.term);
            if (b.caption) parts.push(b.caption);
            if (b.options && Array.isArray(b.options)) parts.push(`Options: ${b.options.join(", ")}`);
            return parts.join("\n");
          })
          .filter(Boolean)
          .join("\n\n");
      } else {
        referenceFacts = page.content || page.contentEn || page.contentAr || "";
      }
    }

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

${referenceFacts ? `
Reference facts from the book page (this is your absolute source of truth; evaluate strictly based on this context):
"""
${referenceFacts}
"""
` : ""}

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

    const isOral = resolvedMode === "oral";
    let modelName = isOral ? "gemini-3.1-flash-live-preview" : (process.env.GEMINI_MODEL || "gemini-3.1-flash-lite");
    let url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

    let response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok && isOral && modelName === "gemini-3.1-flash-live-preview") {
      console.warn(`[api-practice-evaluate] gemini-3.1-flash-live-preview failed with status ${response.status}. Falling back to gemini-3.1-flash-lite.`);
      modelName = "gemini-3.1-flash-lite";
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;
      response = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Gemini API error: ${response.status} - ${errorText}` }), { status: response.status });
    }

    const resJson = await response.json();
    const responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      return new Response(JSON.stringify({ error: "Empty response from Gemini" }), { status: 500 });
    }

    // Log Token Usage Telemetry
    const usageMetadata = resJson.usageMetadata;
    const promptTokens = usageMetadata?.promptTokenCount || 0;
    const completionTokens = usageMetadata?.candidatesTokenCount || 0;
    const totalTokens = usageMetadata?.totalTokenCount || 0;

    if (totalTokens > 0) {
      try {
        const tokenUsagePayload: any = {
          userId: ctx.uid,
          userEmail: ctx.email || "anonymous@fahem.ai",
          promptTokens: Number(promptTokens),
          completionTokens: Number(completionTokens),
          totalTokens: Number(totalTokens),
          model: modelName,
          type: "practice_evaluation"
        };
        if (bookId && pageNumber !== undefined) {
          tokenUsagePayload.context = {
            book_id: bookId,
            page: Number(pageNumber),
            feature: "question"
          };
        }
        await proxyRequest("/user/token-usage", "POST", tokenUsagePayload);
      } catch (err) {
        console.warn("[api-practice-evaluate] Failed to log token usage:", err);
      }
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
