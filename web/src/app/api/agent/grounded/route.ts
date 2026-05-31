import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { GoogleAuth } from "google-auth-library";
import { proxyRequest } from "../../proxy";

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

async function getGcpAccessToken(): Promise<string | null> {
  try {
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"]
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    return tokenResponse.token || null;
  } catch (err: any) {
    console.warn("Failed to get GCP access token for Model Armor:", err.message);
    return null;
  }
}

async function checkModelArmor(prompt: string): Promise<{ blocked: boolean; reason?: string }> {
  try {
    const token = await getGcpAccessToken();
    if (!token) {
      console.warn("Model Armor: No GCP token available. Skipping pre-flight.");
      return { blocked: false };
    }

    const projectId = process.env.GCP_PROJECT || "fahem-88d40";
    const location = process.env.GCP_LOCATION || "us-central1";
    const templateId = process.env.MODEL_ARMOR_TEMPLATE || "fahem-default-template";

    const url = `https://modelarmor.${location}.rep.googleapis.com/v1/projects/${projectId}/locations/${location}/templates/${templateId}:sanitizeUserPrompt`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        userPromptData: {
          text: prompt
        }
      })
    });

    if (res.ok) {
      const data: any = await res.json();
      const sanitizationResult = data?.sanitizationResult;
      if (sanitizationResult) {
        const filterMatchState = sanitizationResult.filterMatchState;
        if (filterMatchState === "MATCH_FOUND") {
          return {
            blocked: true,
            reason: "GCP Model Armor: Content flagged as unsafe or violating safety guidelines."
          };
        }
      }
    } else {
      const errText = await res.text();
      console.warn(`Model Armor API returned error status ${res.status}: ${errText}`);
    }
  } catch (err: any) {
    console.error("Error calling GCP Model Armor:", err);
  }
  return { blocked: false };
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, language, userEmail, userId, sessionId } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;
        const safeClose = () => {
          if (!isClosed) {
            try {
              controller.close();
            } catch (e) {
              console.warn("[ReadableStream] SafeClose ignored error:", e);
            }
            isClosed = true;
          }
        };

        try {
          const langName = getLanguageName(language || "en");
          const activeSessionId = sessionId || "sess_" + Date.now();

          // Stream the active session id to the frontend right away
          controller.enqueue(encoder.encode(`[METADATA] SessionId: ${activeSessionId}\n`));

          controller.enqueue(encoder.encode("[System] Spawning Orchestrator for Grounded Multi-Agent test...\n"));
          controller.enqueue(encoder.encode(`Prompt: ${prompt} (Language: ${langName})\n\n`));

          // -------------------------------------------------------------
          // STEP 0: Model Armor Pre-flight check
          // -------------------------------------------------------------
          controller.enqueue(encoder.encode("[METADATA] ActiveAgent: Model Armor\n"));
          controller.enqueue(encoder.encode("[Fahem Agent] [SYSTEM LOG] Running GCP Model Armor pre-flight safety filter...\n"));
          const armorRes = await checkModelArmor(prompt);
          if (armorRes.blocked) {
            controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM LOG] GCP Model Armor BLOCKED prompt: ${armorRes.reason}\n`));
            controller.enqueue(encoder.encode("\n=== Agent Final Output ===\n"));
            controller.enqueue(encoder.encode(`DENIED: Security Policy Violation. Google Cloud Model Armor template flagged the query as unsafe. Please rephrase your query and try again.`));
            controller.enqueue(encoder.encode("\n==========================\n"));
            controller.enqueue(encoder.encode("[METADATA] ActiveAgent: Done\n"));

            if (userId && userEmail) {
              await proxyRequest("/user/activity", "POST", {
                userId,
                userEmail,
                action: "Grounded Search Query",
                status: "BLOCKED",
                details: "Blocked by GCP Model Armor: " + prompt.substring(0, 150)
              }).catch(() => {});
            }

            safeClose();
            return;
          }
          controller.enqueue(encoder.encode("[Fahem Agent] [SYSTEM LOG] GCP Model Armor pre-flight check passed.\n"));

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
          controller.enqueue(encoder.encode("[METADATA] ActiveAgent: Grounded Search\n"));
          controller.enqueue(encoder.encode("[Sub-Agent: Grounded Search] Starting web-grounded research...\n"));
          controller.enqueue(encoder.encode("[Sub-Agent: Grounded Search] Querying live Google Search indices for real-time, accurate facts...\n"));

          const searchStart = performance.now();
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

          const searchEnd = performance.now();
          const searchDuration = ((searchEnd - searchStart) / 1000).toFixed(2);

          const rawFacts = searchResponse.text || "No facts found.";
          controller.enqueue(encoder.encode(`[Sub-Agent: Grounded Search] Research complete in ${searchDuration}s. Facts compiled successfully (${rawFacts.length} chars).\n`));
          controller.enqueue(encoder.encode(`[METADATA] Duration: Grounded Search: ${searchDuration}s\n`));

          // -------------------------------------------------------------
          // STEP 2: Format and Stylizer Sub-agent
          // -------------------------------------------------------------
          controller.enqueue(encoder.encode("[METADATA] ActiveAgent: Stylizer\n"));
          controller.enqueue(encoder.encode("[Sub-Agent: Stylizer] Handing off research to Stylizer agent...\n"));
          controller.enqueue(encoder.encode("[Sub-Agent: Stylizer] Applying custom layout structure, markdown grids, and visual hierarchy...\n"));

          const stylizerStart = performance.now();
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

          let finalResponseText = "";
          for await (const chunk of responseStream) {
            if (chunk.text) {
              finalResponseText += chunk.text;
              controller.enqueue(encoder.encode(chunk.text));
            }
          }

          const stylizerEnd = performance.now();
          const stylizerDuration = ((stylizerEnd - stylizerStart) / 1000).toFixed(2);

          controller.enqueue(encoder.encode("\n==========================\n"));
          controller.enqueue(encoder.encode(`[METADATA] Duration: Stylizer: ${stylizerDuration}s\n`));
          controller.enqueue(encoder.encode("[METADATA] ActiveAgent: Done\n"));
          controller.enqueue(encoder.encode(`\n[CLOSE] Grounded search execution complete. Total time: ${(((performance.now() - searchStart)) / 1000).toFixed(2)}s\n`));

          // -------------------------------------------------------------
          // STEP 3: Session, Chat, Activity, and Token Logging
          // -------------------------------------------------------------
          if (userId && userEmail) {
            // A. Fetch existing session messages
            let existingMessages: any[] = [];
            try {
              const res = await proxyRequest(`/user/chat-session/detail?sessionId=${activeSessionId}`, "GET");
              if (res.ok) {
                const data = await res.json();
                if (data?.session?.messages) {
                  existingMessages = data.session.messages;
                }
              }
            } catch (err) {
              console.warn("Failed to fetch existing session:", err);
            }

            // B. Prepare updated messages list
            const newMessages = [
              ...existingMessages,
              { role: "user", content: prompt, timestamp: new Date().toISOString() },
              { role: "assistant", content: finalResponseText, timestamp: new Date().toISOString() }
            ];

            const isNewSession = existingMessages.length === 0;
            const title = isNewSession 
              ? (prompt.length > 40 ? prompt.substring(0, 40) + "..." : prompt)
              : undefined;

            // C. Save Chat Session
            try {
              await proxyRequest("/user/chat-session", "POST", {
                sessionId: activeSessionId,
                userId,
                userEmail,
                title,
                messages: newMessages
              });
            } catch (err) {
              console.warn("Failed to save session history:", err);
            }

            // D. Log Token Usage
            const searchPromptTokens = searchResponse.usageMetadata?.promptTokenCount || Math.ceil(prompt.length / 4);
            const searchCompTokens = searchResponse.usageMetadata?.candidatesTokenCount || Math.ceil(rawFacts.length / 4);
            const stylPromptTokens = Math.ceil(stylizerPrompt.length / 4);
            const stylCompTokens = Math.ceil(finalResponseText.length / 4);

            const promptTokens = searchPromptTokens + stylPromptTokens;
            const completionTokens = searchCompTokens + stylCompTokens;
            const totalTokens = promptTokens + completionTokens;

            try {
              await proxyRequest("/user/token-usage", "POST", {
                userId,
                userEmail,
                promptTokens,
                completionTokens,
                totalTokens,
                model: modelName,
                type: "grounded_search"
              });
            } catch (err) {
              console.warn("Failed to log token telemetry:", err);
            }

            // E. Log User Activity
            try {
              await proxyRequest("/user/activity", "POST", {
                userId,
                userEmail,
                action: "Grounded Search Query",
                status: "SUCCESS",
                details: prompt.substring(0, 150)
              });
            } catch (err) {
              console.warn("Failed to log user activity:", err);
            }
          }

        } catch (err: any) {
          console.error("[grounded-api] Orchestration failed:", err);
          controller.enqueue(encoder.encode(`\n[ERROR] Grounded Orchestration failed: ${err.message}\n`));
        } finally {
          safeClose();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
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
