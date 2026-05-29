import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";

function getLanguageName(lang: string): string {
  const mapping: { [key: string]: string } = {
    en: "English",
    ar: "Arabic",
    fr: "French",
    de: "German",
    es: "Spanish",
    it: "Italian",
    zh: "Chinese"
  };
  return mapping[lang] || "English";
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, language, userEmail, userId } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const langName = getLanguageName(language || "en");

          controller.enqueue(encoder.encode("[System] Spawning Orchestrator for Grounded Multi-Agent test...\n"));
          controller.enqueue(encoder.encode(`Prompt: ${prompt} (Language: ${langName})\n\n`));

          // Initialize Gemini AI Client
          const geminiApiKey = process.env.GEMINI_API_KEY;
          if (!geminiApiKey) {
            throw new Error("GEMINI_API_KEY environment variable is not configured.");
          }
          const ai = new GoogleGenAI({ apiKey: geminiApiKey });
          const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

          // -------------------------------------------------------------
          // STEP 1: Grounded Search Sub-agent
          // -------------------------------------------------------------
          controller.enqueue(encoder.encode("[Sub-Agent: Grounded Search] Starting web-grounded research...\n"));
          controller.enqueue(encoder.encode("[Sub-Agent: Grounded Search] Querying live Google Search indices for real-time, accurate facts...\n"));

          const searchInstruction = `
You are the Fahem Grounded Search Sub-agent.
Your goal is to use Google Search grounding to retrieve extremely accurate, real-world, up-to-date facts to answer the user's prompt.
Provide precise citations, dates, prices, or numbers. Keep your tone highly informative and objective.
Please compile your final facts in ${langName}.
`;

          const searchResponse = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction: searchInstruction,
              tools: [{ googleSearch: {} }] // Native Google Search Grounding!
            }
          });

          const rawFacts = searchResponse.text || "No facts found.";
          controller.enqueue(encoder.encode(`[Sub-Agent: Grounded Search] Research complete. Facts compiled successfully (${rawFacts.length} chars).\n`));

          // -------------------------------------------------------------
          // STEP 2: Format and Stylizer Sub-agent
          // -------------------------------------------------------------
          controller.enqueue(encoder.encode("[Sub-Agent: Stylizer] Handing off research to Stylizer agent...\n"));
          controller.enqueue(encoder.encode("[Sub-Agent: Stylizer] Applying custom layout structure, markdown grids, and visual hierarchy...\n"));

          const stylizerInstruction = `
You are the Fahem Format and Stylizer Sub-agent.
Your sole job is to take raw, search-grounded research facts and turn them into a premium, stunning presentation.
Use rich markdown tables, structured sections, highlight blocks, and relevant emojis.
Make sure the final output feels premium, executive-grade, and beautifully structured in ${langName}.
`;

          const stylizerPrompt = `
Format and stylize the following search-grounded research facts into a premium markdown document in ${langName}:

${rawFacts}
`;

          controller.enqueue(encoder.encode("\n=== Agent Final Output ===\n"));

          const responseStream = await ai.models.generateContentStream({
            model: modelName,
            contents: stylizerPrompt,
            config: {
              systemInstruction: stylizerInstruction
            }
          });

          for await (const chunk of responseStream) {
            if (chunk.text) {
              controller.enqueue(encoder.encode(chunk.text));
            }
          }

          controller.enqueue(encoder.encode("\n==========================\n"));
          controller.enqueue(encoder.encode("\n[CLOSE] Grounded search execution complete\n"));

        } catch (err: any) {
          console.error("[grounded-api] Orchestration failed:", err);
          controller.enqueue(encoder.encode(`\n[ERROR] Grounded Orchestration failed: ${err.message}\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache, no-transform"
      }
    });

  } catch (e: unknown) {
    const err = e as Error;
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
