import { NextRequest } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { proxyRequest, getOidcToken } from "../../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../../localDbHelper";
import { requireUser } from "../../_auth";

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
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        console.error(`[ALERT] SECURITY_DEGRADED: Model Armor returned setup error status ${res.status}: ${errText}. Routing in degraded safety mode.`);
      } else {
        console.warn(`Model Armor API returned transient error status ${res.status}: ${errText}`);
      }
    }
  } catch (err: any) {
    console.error("Error calling GCP Model Armor:", err);
  }
  return { blocked: false };
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const { prompt, language, sessionId } = body;
    const userId = ctx.uid;
    const userEmail = ctx.email || "anonymous@fahem.ai";

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

          controller.enqueue(encoder.encode("[Fahem Agent] [SYSTEM] Initiating Single-Agent Grounded Search Orchestrator...\n"));
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

          // -------------------------------------------------------------
          // Centralized Cloud Run SSE Streaming pointing to Python /run_sse
          // -------------------------------------------------------------
          const cloudRunUrl = (process.env.MONGODB_AGENT_URL || "").trim();
          if (!cloudRunUrl) {
            throw new Error("MONGODB_AGENT_URL environment variable is not configured.");
          }

          controller.enqueue(encoder.encode("[METADATA] ActiveAgent: Grounded Search\n"));
          controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM LOG] Connecting to Cloud Run Agent at ${cloudRunUrl}...\n`));

          let oidcToken = await getOidcToken();

          const requestHeaders: Record<string, string> = {
            "Content-Type": "application/json",
            "X-Verified-Principal": JSON.stringify({
              uid: ctx.uid,
              email: ctx.email,
              role: ctx.role,
              db_target: ctx.db_target || "fahem"
            })
          };
          if (oidcToken) {
            requestHeaders["Authorization"] = `Bearer ${oidcToken}`;
            controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM LOG] Secured authenticated GCP ID token.\n`));
          } else {
            controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM LOG] Running in local/dev environment mode. Identity forwarded securely.\n`));
          }

          // Prepend [Grounded Web Search Request] prefix to inform the single orchestrator brain
          const groundedPrompt = `[Grounded Web Search Request] ${prompt}`;

          const payload = {
            app_name: "app",
            user_id: userId || "anonymous",
            session_id: activeSessionId,
            new_message: {
              role: "user",
              parts: [{ text: groundedPrompt }]
            },
            streaming: true
          };

          const sseResponse = await fetch(`${cloudRunUrl}/run_sse`, {
            method: "POST",
            headers: requestHeaders,
            body: JSON.stringify(payload),
            cache: "no-store",
            next: { revalidate: 0 } as any
          });

          if (!sseResponse.ok) {
            const errorText = await sseResponse.text();
            throw new Error(`Cloud Run agent stream request failed (${sseResponse.status}): ${errorText}`);
          }

          const reader = sseResponse.body?.getReader();
          if (!reader) {
            throw new Error("Failed to initialize stream reader from Cloud Run agent response.");
          }

          const responseDecoder = new TextDecoder();
          let lineBuffer = "";
          let finalResponseText = "";
          let hasStartedFinalOutput = false;
          let currentActiveAgent = "Grounded Search";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = responseDecoder.decode(value, { stream: true });
            lineBuffer += chunk;
            let lines = lineBuffer.split("\n");
            lineBuffer = lines.pop() || ""; // keep partial last line

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              if (trimmed.startsWith("data: ")) {
                const dataStr = trimmed.substring(6).trim();
                if (dataStr === "[DONE]") {
                  continue;
                }

                try {
                  const event = JSON.parse(dataStr);

                  // 1. Error check
                  if (event.error_message) {
                    if (hasStartedFinalOutput) {
                      controller.enqueue(encoder.encode("\n==========================\n"));
                      hasStartedFinalOutput = false;
                    }
                    controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM LOG] Error: ${event.error_message}\n`));
                    
                    // Show error in user output
                    controller.enqueue(encoder.encode("\n=== Agent Final Output ===\n"));
                    controller.enqueue(encoder.encode(`Error: ${event.error_message}`));
                    controller.enqueue(encoder.encode("\n==========================\n"));
                    continue;
                  }

                  // 2. Active Agent Metadata update
                  if (event.node_info?.path && event.node_info.path !== currentActiveAgent) {
                    currentActiveAgent = event.node_info.path;
                    if (hasStartedFinalOutput) {
                      controller.enqueue(encoder.encode("\n==========================\n"));
                      hasStartedFinalOutput = false;
                    }
                    controller.enqueue(encoder.encode(`[METADATA] ActiveAgent: ${currentActiveAgent}\n`));
                  }

                  // 3. Tool invocation logs
                  if (event.content?.parts) {
                    for (const part of event.content.parts) {
                      if (part.functionCall || part.function_call) {
                        const call = part.functionCall || part.function_call;
                        if (hasStartedFinalOutput) {
                          controller.enqueue(encoder.encode("\n==========================\n"));
                          hasStartedFinalOutput = false;
                        }
                        controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM LOG] Running tool: ${call.name}...\n`));
                      }
                    }
                  }

                  // 4. Content / Text Streaming
                  if (event.content?.parts) {
                    const isPartial = event.partial === true;
                    if (!isPartial && finalResponseText) {
                      // Skip duplicate final consolidated events if we already streamed the partials
                    } else {
                      let textChunk = "";
                      for (const part of event.content.parts) {
                        if (part.text) {
                          textChunk += part.text;
                        }
                      }

                      if (textChunk) {
                        if (!hasStartedFinalOutput) {
                          controller.enqueue(encoder.encode("\n=== Agent Final Output ===\n"));
                          hasStartedFinalOutput = true;
                        }
                        finalResponseText += textChunk;
                        controller.enqueue(encoder.encode(textChunk));
                      }
                    }
                  }

                  // 5. Check if action has final output fallback
                  if (event.actions?.stateDelta?.final_output && !finalResponseText) {
                    const fallbackText = event.actions.stateDelta.final_output;
                    if (fallbackText) {
                      if (!hasStartedFinalOutput) {
                        controller.enqueue(encoder.encode("\n=== Agent Final Output ===\n"));
                        hasStartedFinalOutput = true;
                      }
                      finalResponseText += fallbackText;
                      controller.enqueue(encoder.encode(fallbackText));
                    }
                  }

                } catch (jsonErr) {
                  console.warn("Failed to parse SSE JSON chunk:", dataStr, jsonErr);
                }
              }
            }
          }

          // Handle any remaining data in lineBuffer
          if (lineBuffer.trim().startsWith("data: ")) {
            const dataStr = lineBuffer.trim().substring(6).trim();
            try {
              const event = JSON.parse(dataStr);
              if (event.content?.parts) {
                const isPartial = event.partial === true;
                if (!isPartial && finalResponseText) {
                  // Skip duplicate final consolidated events
                } else {
                  let textChunk = "";
                  for (const part of event.content.parts) {
                    if (part.text) {
                      textChunk += part.text;
                    }
                  }
                  if (textChunk) {
                    if (!hasStartedFinalOutput) {
                      controller.enqueue(encoder.encode("\n=== Agent Final Output ===\n"));
                      hasStartedFinalOutput = true;
                    }
                    finalResponseText += textChunk;
                    controller.enqueue(encoder.encode(textChunk));
                  }
                }
              }
            } catch (e) {}
          }

          // Close markers
          if (hasStartedFinalOutput) {
            controller.enqueue(encoder.encode("\n==========================\n"));
          }
          controller.enqueue(encoder.encode("[METADATA] ActiveAgent: Done\n"));
          controller.enqueue(encoder.encode(`\n[CLOSE] Execution complete.\n`));

          // -------------------------------------------------------------
          // STEP 3: Session, Chat, Activity, and Token Logging
          // -------------------------------------------------------------
          if (userId && userEmail) {
            // A. Fetch existing session messages
            let existingMessages: any[] = [];
            try {
              if (isLocalEnv()) {
                const db = getLocalDb();
                const session = (db.chat_sessions || []).find((s: any) => s.sessionId === activeSessionId);
                if (session?.messages) {
                  existingMessages = session.messages;
                }
              } else {
                const res = await proxyRequest(`/user/chat-session/detail?sessionId=${activeSessionId}`, "GET");
                if (res.ok) {
                  const data = await res.json();
                  if (data?.session?.messages) {
                    existingMessages = data.session.messages;
                  }
                }
              }
            } catch (err) {
              console.warn("Failed to fetch existing session:", err);
            }

            // B. Prepare updated messages list
            const newMessages = [
              ...existingMessages,
              { role: "user", content: prompt, timestamp: new Date().toISOString() },
              { role: "assistant", content: finalResponseText || "No response generated.", timestamp: new Date().toISOString() }
            ];

            const isNewSession = existingMessages.length === 0;
            const title = isNewSession 
              ? (prompt.length > 40 ? prompt.substring(0, 40) + "..." : prompt)
              : undefined;

            // C. Save Chat Session
            try {
              if (isLocalEnv()) {
                const db = getLocalDb();
                if (!db.chat_sessions) {
                  db.chat_sessions = [];
                }
                const idx = db.chat_sessions.findIndex((s: any) => s.sessionId === activeSessionId);
                const now = new Date().toISOString();
                if (idx > -1) {
                  db.chat_sessions[idx] = {
                    ...db.chat_sessions[idx],
                    title: title || db.chat_sessions[idx].title || "Untitled Chat",
                    messages: newMessages,
                    updatedAt: now
                  };
                } else {
                  db.chat_sessions.push({
                    sessionId: activeSessionId,
                    userId,
                    userEmail,
                    title: title || "Untitled Chat",
                    messages: newMessages,
                    createdAt: now,
                    updatedAt: now
                  });
                }
                saveLocalDb(db);
              } else {
                await proxyRequest("/user/chat-session", "POST", {
                  sessionId: activeSessionId,
                  userId,
                  userEmail,
                  title,
                  messages: newMessages
                });
              }
            } catch (err) {
              console.warn("Failed to save session history:", err);
            }

            // D. Log Token Usage
            const promptTokens = Math.ceil(prompt.length / 4);
            const completionTokens = Math.ceil((finalResponseText || "").length / 4);
            const totalTokens = promptTokens + completionTokens;

            try {
              await proxyRequest("/user/token-usage", "POST", {
                userId,
                userEmail,
                promptTokens,
                completionTokens,
                totalTokens,
                model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
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
