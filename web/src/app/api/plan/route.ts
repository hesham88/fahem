import { NextRequest } from "next/server";
import { requireUser } from "../_auth";
import { proxyRequest } from "../proxy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const { scopeType, subject, bookId, chapters, concepts, prompt: userPrompt, language } = body;

    const resolvedLanguage = language === "ar" ? "ar" : "en";
    const targetSubject = scopeType === "book" ? `Book ID: ${bookId}` : (subject || "General Academic Topic");
    const targetChapters = chapters && chapters.length > 0 ? chapters.join(", ") : "All Chapters";
    const targetConcepts = concepts ? ` focusing on: ${concepts}` : "";
    const customGoals = userPrompt ? `\nUser's Custom Goals & Guidance: "${userPrompt}"` : "";

    const prompt = `
You are the elite "Fahem Blueprint" custom academic study planner.
Your task is to generate an extremely comprehensive, high-yield, and highly practical academic study plan in Markdown format.

Context Scope:
- Target Material: ${targetSubject}
- Target Chapters/Topics: ${targetChapters}${targetConcepts}
- Language: ${resolvedLanguage === "ar" ? "Arabic" : "English"}${customGoals}

Structure the Markdown report beautifully with:
- A main title (use single #, e.g., "# 📅 خطة المذاكرة الذكية: ..." or "# 📅 Custom AI Study Blueprint: ...")
- An executive summary/essence section (Weekly Focus & Objectives)
- A detailed Week-by-Week (or Day-by-Day) breakdown. Provide explicit milestones, daily reading sections, active recall practice recommendations, and key concept highlights.
- Clear sub-headings (use ## and ###)
- Use rich formatting: bold keywords, bullet points, checklists (- [ ] task) to make it interactive, and clean tables or comparison blocks where applicable to make it look premium.
- Use an encouraging, motivating, and highly professional academic tone.

You MUST respond with a JSON object strictly matching this schema:
{
  "plan": "The complete markdown formatted string containing the full academic plan"
}
`;

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "Gemini API key is not configured" }), { status: 500 });
    }

    const modelName = "deep-research-preview-04-2026";
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

    // Log Token Usage Telemetry
    const usageMetadata = resJson.usageMetadata;
    const promptTokens = usageMetadata?.promptTokenCount || 0;
    const completionTokens = usageMetadata?.candidatesTokenCount || 0;
    const totalTokens = usageMetadata?.totalTokenCount || 0;

    if (totalTokens > 0) {
      try {
        await proxyRequest("/user/token-usage", "POST", {
          userId: ctx.uid,
          userEmail: ctx.email || "anonymous@fahem.ai",
          promptTokens: Number(promptTokens),
          completionTokens: Number(completionTokens),
          totalTokens: Number(totalTokens),
          model: modelName,
          type: "study_plan"
        });
      } catch (err) {
        console.warn("[api-plan] Failed to log token usage:", err);
      }
    }

    const data = JSON.parse(responseText.trim());
    return new Response(JSON.stringify({ success: true, plan: data.plan }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[api-plan] Failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
