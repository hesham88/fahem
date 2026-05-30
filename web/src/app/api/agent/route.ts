import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { GoogleAuth } from "google-auth-library";
import { proxyRequest, getOidcToken } from "../proxy";

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
        try {
          const langName = getLanguageName(language || "en");
          const activeSessionId = sessionId || "sess_" + Date.now();

          // Stream the active session id to the frontend right away
          controller.enqueue(encoder.encode(`[METADATA] SessionId: ${activeSessionId}\n`));

          // Initial terminal logs
          controller.enqueue(encoder.encode("[Fahem Agent] [SYSTEM] Initiating Native TypeScript ADK Orchestration...\n"));
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
                action: "Standard Agent Query",
                status: "BLOCKED",
                details: "Blocked by GCP Model Armor: " + prompt.substring(0, 150)
              }).catch(() => {});
            }

            controller.close();
            return;
          }
          controller.enqueue(encoder.encode("[Fahem Agent] [SYSTEM LOG] GCP Model Armor pre-flight check passed.\n"));

          // Initialize Gemini AI Client
          const geminiApiKey = process.env.GEMINI_API_KEY;
          if (!geminiApiKey) {
            throw new Error("GEMINI_API_KEY environment variable is not configured.");
          }
          const ai = new GoogleGenAI({ apiKey: geminiApiKey });
          const modelName = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

          // -------------------------------------------------------------
          // STEP 1: Guardrail Gate
          // -------------------------------------------------------------
          controller.enqueue(encoder.encode("[METADATA] ActiveAgent: Guardrail Audit\n"));
          controller.enqueue(encoder.encode("[Fahem Agent] [SYSTEM LOG] Running security and authentication guardrails...\n"));

          const guardStart = performance.now();
          const guardrailSystemInstruction = `
You are the Fahem Security Guardrail Agent.
Your sole role is to audit user prompts, queries, and user context to verify they are secure and authorized.

You must perform these strict checks:
1. **Authentication Gate**: Inspect if a valid 'user_email' or 'user_id' is provided. For standard inspections or queries (read-only), allow anonymous/unauthenticated access. For WRITE operations (inserting, updating, deleting, or reporting), a valid user email is STRICTLY REQUIRED. If empty or anonymous during a write operation, reject with 'UNAUTHORIZED: User must be signed-in to perform write operations'.
2. **Administrative Lock**: Strictly reject any commands or tools starting with 'atlas-'. Standard users should never manage clusters or projects.
3. **Injection and Drop Protection**: Block malicious injection payloads or destructive operations like dropping/deleting databases, unless it's a valid and authenticated report creation.

If all criteria are fully met, respond exactly with "CONFIRMED: Authorized".
If any criteria fail, respond with "DENIED: <clear explanation in the user's requested language>".
`;

          const reviewPayload = {
            user_prompt: prompt,
            user_email: userEmail || "",
            user_id: userId || "",
            language: language || "en"
          };

          const guardrailResponse = await ai.models.generateContent({
            model: modelName,
            contents: JSON.stringify(reviewPayload),
            config: {
              systemInstruction: guardrailSystemInstruction
            }
          });

          const guardEnd = performance.now();
          const guardDuration = ((guardEnd - guardStart) / 1000).toFixed(2);

          const guardText = guardrailResponse.text ? guardrailResponse.text.trim() : "";
          const isConfirmed = guardText.includes("CONFIRMED");

          controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM LOG] Guardrail check complete in ${guardDuration}s. Result: ${guardText}\n`));
          controller.enqueue(encoder.encode(`[METADATA] Duration: Guardrail Audit: ${guardDuration}s\n`));

          let databaseResults = "";
          let executionSuccess = false;

          if (isConfirmed) {
            // -------------------------------------------------------------
            // STEP 2: Database Engine (Cloud Run execution)
            // -------------------------------------------------------------
            controller.enqueue(encoder.encode("[METADATA] ActiveAgent: Database Engine\n"));
            const cloudRunUrl = (process.env.MONGODB_AGENT_URL || "").trim();
            if (!cloudRunUrl) {
              throw new Error("MONGODB_AGENT_URL environment variable is not configured.");
            }

            controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM LOG] Sending query execution to Cloud Run Agent: ${cloudRunUrl}...\n`));

            const dbStart = performance.now();

            // Fetch GCP OIDC identity token for service-to-service authentication
            const oidcToken = await getOidcToken();

            const requestHeaders: Record<string, string> = {
              "Content-Type": "application/json"
            };
            if (oidcToken) {
              requestHeaders["Authorization"] = `Bearer ${oidcToken}`;
              controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM LOG] Secured authenticated GCP ID token.\n`));
            } else {
              controller.enqueue(encoder.encode("[Fahem Agent] [SYSTEM LOG] Warning: No GCP ID token secured. Continuing unauthenticated.\n"));
            }

            // Enforce and pass structured context variables safely inside prompt text payload as JSON
            const serializedContext = JSON.stringify({
              prompt: prompt,
              language: language || "en",
              user_email: userEmail || "",
              user_id: userId || "",
              username: userEmail ? userEmail.split("@")[0] : "anonymous",
              credits: 100 // Managed on-the-fly inside agent state
            });

            const payload = {
              user_id: userId || "anonymous",
              session_id: "fahem_microservice_session",
              app_name: "app",
              new_message: {
                role: "user",
                parts: [{ text: serializedContext }]
              },
              streaming: false
            };

            const response = await fetch(`${cloudRunUrl}/run`, {
              method: "POST",
              headers: requestHeaders,
              body: JSON.stringify(payload)
            });

            const dbEnd = performance.now();
            const dbDuration = ((dbEnd - dbStart) / 1000).toFixed(2);

            if (response.ok) {
              const resData: any = await response.json();
              const outMsg = resData?.output?.message;
              if (outMsg && Array.isArray(outMsg.parts)) {
                databaseResults = outMsg.parts.map((p: any) => p.text || "").join("");
              } else {
                databaseResults = JSON.stringify(resData);
              }
              executionSuccess = true;
              controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM LOG] Query executed successfully in ${dbDuration}s. Formatting results...\n`));
              controller.enqueue(encoder.encode(`[METADATA] Duration: Database Engine: ${dbDuration}s\n`));
            } else {
              const errorText = await response.text();
              throw new Error(`Microservice HTTP error: ${response.status} - ${errorText}`);
            }
          }

          // -------------------------------------------------------------
          // STEP 3: Orchestrator Presentation Phase
          // -------------------------------------------------------------
          controller.enqueue(encoder.encode("[METADATA] ActiveAgent: Orchestrator\n"));
          controller.enqueue(encoder.encode("[Fahem Agent] [SYSTEM LOG] Presenting final output to user dashboard...\n"));

          const orchestratorSystemInstruction = `
You are the Fahem Multi-Agent Orchestrator.
Your job is to receive, process, and beautifully format database operations or security alerts for the user dashboard.

When compiling database output results:
1. Avoid raw JSON or BSON dumps.
2. Construct highly professional, premium Markdown tables, lists, or structured cards.
3. Localize explanations, text, table headers, and statuses fully into the user's selected language.
4. Preserve technical names such as collection names, database names, or specific keys as-is.

When presenting a security denial message:
1. Explain politely in the requested language that security guardrails blocked the execution.
2. Highlight the active safety enforcement without releasing internal developer secrets.
`;

          let presentationPrompt = "";
          if (isConfirmed && executionSuccess) {
            presentationPrompt = `
Format and present the following database results nicely in ${langName} for the user dashboard.
Use clean Markdown tables, lists, or structured highlights.
Ensure it feels extremely premium and clear.

Raw Database Results:
${databaseResults}
`;
          } else {
            presentationPrompt = `
Present a polite security denial message in ${langName} to the user explaining why their request was blocked.
Highlight that security guardrails are active and administrative/unauthorized operations are blocked.

Reason for denial:
${guardText || "Access unauthorized"}
`;
          }

          const orchStart = performance.now();

          // Signal start of final output to the frontend parser
          controller.enqueue(encoder.encode("\n=== Agent Final Output ===\n"));

          const responseStream = await ai.models.generateContentStream({
            model: modelName,
            contents: presentationPrompt,
            config: {
              systemInstruction: orchestratorSystemInstruction
            }
          });

          let finalResponseText = "";
          for await (const chunk of responseStream) {
            if (chunk.text) {
              finalResponseText += chunk.text;
              controller.enqueue(encoder.encode(chunk.text));
            }
          }

          const orchEnd = performance.now();
          const orchDuration = ((orchEnd - orchStart) / 1000).toFixed(2);

          // Signal close of final output
          controller.enqueue(encoder.encode("\n==========================\n"));
          controller.enqueue(encoder.encode(`[METADATA] Duration: Orchestrator: ${orchDuration}s\n`));
          controller.enqueue(encoder.encode("[METADATA] ActiveAgent: Done\n"));
          controller.enqueue(encoder.encode(`\n[CLOSE] Execution complete. Total time: ${(((performance.now() - guardStart)) / 1000).toFixed(2)}s\n`));

          // -------------------------------------------------------------
          // STEP 4: Session, Chat, Activity, and Token Logging
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
            const guardPrompt = guardrailResponse.usageMetadata?.promptTokenCount || Math.ceil(JSON.stringify(reviewPayload).length / 4);
            const guardComp = guardrailResponse.usageMetadata?.candidatesTokenCount || Math.ceil((guardrailResponse.text || "").length / 4);
            const orchPrompt = Math.ceil(presentationPrompt.length / 4);
            const orchComp = Math.ceil(finalResponseText.length / 4);

            const promptTokens = guardPrompt + orchPrompt;
            const completionTokens = guardComp + orchComp;
            const totalTokens = promptTokens + completionTokens;

            try {
              await proxyRequest("/user/token-usage", "POST", {
                userId,
                userEmail,
                promptTokens,
                completionTokens,
                totalTokens,
                model: modelName,
                type: isConfirmed ? "standard_orchestrator" : "guardrail_block"
              });
            } catch (err) {
              console.warn("Failed to log token telemetry:", err);
            }

            // E. Log User Activity
            try {
              await proxyRequest("/user/activity", "POST", {
                userId,
                userEmail,
                action: isConfirmed ? "Standard Agent Query" : "Standard Agent Query (Guardrail Blocked)",
                status: isConfirmed ? "SUCCESS" : "BLOCKED",
                details: isConfirmed ? prompt.substring(0, 150) : `Blocked prompt: ${prompt.substring(0, 100)}`
              });
            } catch (err) {
              console.warn("Failed to log user activity:", err);
            }
          }

        } catch (err: any) {
          console.error("[agent-api] Orchestration failed:", err);
          controller.enqueue(encoder.encode(`\n[ERROR] Orchestration failed: ${err.message}\n`));
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

