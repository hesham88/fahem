import { NextRequest } from "next/server";
import { requireUser } from "../_auth";
import { proxyRequest } from "../proxy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const { concept, language } = body;

    const resolvedLanguage = language === "ar" ? "ar" : "en";
    const resolvedConcept = concept || "General Academic Topic";

    const prompt = `
You are the elite "Zatona" academic research assistant for the Fahem education platform.
Your task is to generate an extremely comprehensive, high-yield, and multi-chapter academic research report in Markdown format about the concept: "${resolvedConcept}".

Language of the report must be: ${resolvedLanguage === "ar" ? "Arabic" : "English"}.

Structure the Markdown report beautifully with:
- A main title (use single #)
- An executive summary/essence section (Zatona/الزتونة)
- At least 3 detailed chapters/sections explaining different dimensions of the topic, with clear sub-headings (use ## and ###).
- Use rich formatting: bold keywords, bullet points, and clean tables or comparison blocks where applicable to make it look premium.
- Use encouraging, engaging, and professional academic tone.

You MUST respond with a JSON object strictly matching this schema:
{
  "report": "The complete markdown formatted string containing the full report"
}
`;

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "Gemini API key is not configured" }), { status: 500 });
    }

    const modelName = "gemini-3.1-pro-preview";
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
          type: "zatona_research"
        });
      } catch (err) {
        console.warn("[api-zatona] Failed to log token usage:", err);
      }
    }

    // Be resilient to the model's output shape: prefer the JSON { report } field, but fall back to
    // the raw markdown (code fences stripped) so a non-JSON reply still yields a usable Zatona.
    let report = "";
    try {
      const parsed = JSON.parse(responseText.trim());
      report = parsed.report || parsed.text || parsed.summary || "";
    } catch {
      report = "";
    }
    if (!report) {
      report = responseText.trim().replace(/^```(?:json|markdown)?\s*/i, "").replace(/```\s*$/i, "").trim();
    }
    if (!report) {
      return new Response(JSON.stringify({ error: "Empty Zatona report from model" }), { status: 500 });
    }
    return new Response(JSON.stringify({ success: true, report }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[api-zatona] Failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
