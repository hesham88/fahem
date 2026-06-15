import { NextRequest } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { proxyRequest, getOidcToken } from "../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb, resolveScriptPath, shouldSkipDirectMongo, checkFocusLockLocal, getDbTarget } from "../localDbHelper";
import { checkIsSuperadmin, checkIsAdmin } from "../admin/helper";
import { requireUser } from "../_auth";
import { spawn } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

declare global {
  var activeBookJobs: Map<string, any> | undefined;
}

if (!global.activeBookJobs) {
  global.activeBookJobs = new Map();
}

async function getJobMetadata(jobId: string): Promise<any> {
  if (isLocalEnv()) {
    try {
      const db = getLocalDb() as any;
      const jobs = db.ingestion_jobs || [];
      return jobs.find((j: any) => j._id === jobId) || null;
    } catch (e) {
      return null;
    }
  } else {
    try {
      const res = await proxyRequest(`/user/books/jobs?jobId=${encodeURIComponent(jobId)}`, "GET");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.job) {
          return data.job;
        }
      }
      return null;
    } catch (e) {
      console.error("[agent-api] getJobMetadata failed via proxy:", e);
      return null;
    }
  }
}


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

function cleanFabricatedUrls(text: string): string {
  if (!text) return text;
  // Convert [Text](http://external) or [Text](https://external) or [Text](www.external) to just Text
  return text.replace(/\[([^\]]+)\]\(((?:https?:\/\/|www\.)[^\s)]+)\)/g, "$1");
}

function extractFinalAgentOutput(resData: any): string {
  if (!resData) return "";
  if (!Array.isArray(resData)) {
    const outMsg = resData?.output?.message;
    if (outMsg && Array.isArray(outMsg.parts)) {
      return outMsg.parts.map((p: any) => p.text || "").join("");
    }
    return typeof resData === "string" ? resData : JSON.stringify(resData);
  }

  // Iterate backwards from the end of the array to find the last meaningful final output
  for (let i = resData.length - 1; i >= 0; i--) {
    const step = resData[i];
    
    // 1. Check for stateDelta.final_output (or stateDelta.database_results)
    if (step.actions?.stateDelta) {
      if (step.actions.stateDelta.final_output) {
        return step.actions.stateDelta.final_output;
      }
      if (step.actions.stateDelta.database_results) {
        return step.actions.stateDelta.database_results;
      }
    }

    // 2. Check for step.output (if it's a non-empty string and not just seed info)
    if (typeof step.output === "string" && step.output.trim()) {
      const trimmed = step.output.trim();
      if (!trimmed.startsWith("Orchestrator seed prompt:") && !trimmed.startsWith("CONFIRMED: Authorized")) {
        return trimmed;
      }
    }

    // 3. Check for step.content.parts representing the model response
    if (step.content?.parts && Array.isArray(step.content.parts)) {
      const text = step.content.parts
        .map((p: any) => p.text || "")
        .join("")
        .trim();
      if (text) {
        return text;
      }
    }
  }

  // Fallback to stringifying the whole thing
  return JSON.stringify(resData);
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
    const { prompt, language, sessionId, onboarding, recaptchaToken, selected_book_ids, selected_text, book_id, page } = body;
    const userId = ctx.uid;
    const userEmail = ctx.email || "anonymous@fahem.ai";

    // Focus Lock Check (Suppress companion during active assignments)
    if (isLocalEnv()) {
      const lock = checkFocusLockLocal(ctx.uid, ctx.role);
      if (lock.locked && lock.reason === "assignment_active") {
        return new Response(JSON.stringify({ error: language === "ar" ? lock.message_ar : lock.message, focusLocked: true }), {
          status: 423,
          headers: { "Content-Type": "application/json" }
        });
      }
    } else {
      try {
        const { checkFocusLockProd } = require("../assignments/helper");
        const lock = await checkFocusLockProd(ctx.uid, ctx.role);
        if (lock.locked && lock.reason === "assignment_active") {
          return new Response(JSON.stringify({ error: language === "ar" ? lock.message_ar : lock.message, focusLocked: true }), {
            status: 423,
            headers: { "Content-Type": "application/json" }
          });
        }
      } catch (err) {
        console.error("Failed to check focus lock in production:", err);
      }
    }
    if (recaptchaToken) {
      console.log(`[reCAPTCHA Enterprise Server-Side] Received action protection token: ${recaptchaToken.substring(0, 15)}...`);
      try {
        const cloudRunUrl = (process.env.MONGODB_AGENT_URL || "").trim();
        if (cloudRunUrl) {
          const actionName = onboarding ? "ONBOARDING" : "REPORT_SUBMIT";
          const verifyRes = await fetch(`${cloudRunUrl}/verify-recaptcha`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              token: recaptchaToken,
              action: actionName
            })
          });
          if (verifyRes.ok) {
            const assessment = await verifyRes.json();
            console.log("[reCAPTCHA Enterprise Server-Side] Assessment result:", assessment);
            if (assessment.success === false) {
              console.warn(`[reCAPTCHA Enterprise Server-Side] Token assessment failed (${assessment.status}). Rejecting request.`);
              return new Response(JSON.stringify({ error: "Access Denied: reCAPTCHA Enterprise verification failed." }), {
                status: 403,
                headers: { "Content-Type": "application/json" }
              });
            }
          } else {
            console.warn(`[reCAPTCHA Enterprise Server-Side] Verification endpoint returned status: ${verifyRes.status}`);
          }
        }
      } catch (err) {
        console.error("[reCAPTCHA Enterprise Server-Side] Connection error during microservice verification:", err);
      }
    } else {
      console.log("[reCAPTCHA Enterprise Server-Side] No action protection token provided (Fail-Open or Direct Action).");
    }

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
          const activeSessionId = onboarding
            ? (sessionId || `onboarding_session_${userId || "anonymous"}`)
            : (sessionId || "sess_" + Date.now());

          // Stream the active session id to the frontend right away
          controller.enqueue(encoder.encode(`[METADATA] SessionId: ${activeSessionId}\n`));

          // Initial terminal logs
          if (onboarding) {
            controller.enqueue(encoder.encode("[METADATA] ActiveAgent: Onboarding\n"));
            controller.enqueue(encoder.encode("[Fahem Agent] [SYSTEM LOG] Running conversational onboarding agent...\n"));
          } else {
            controller.enqueue(encoder.encode("[Fahem Agent] [SYSTEM] Initiating Single-Agent ADK 2.0 Orchestrator...\n"));
            controller.enqueue(encoder.encode(`Prompt: ${prompt} (Language: ${langName})\n\n`));
          }

          // -------------------------------------------------------------
          // Centralized Cloud Run SSE Streaming
          // -------------------------------------------------------------
          const cloudRunUrl = (process.env.MONGODB_AGENT_URL || "").trim();
          if (!cloudRunUrl) {
            throw new Error("MONGODB_AGENT_URL environment variable is not configured.");
          }

          controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM LOG] Connecting to Cloud Run Agent at ${cloudRunUrl}...\n`));

          // Fetch GCP OIDC identity token for service-to-service authentication
          let oidcToken = await getOidcToken();

          const requestHeaders: Record<string, string> = {
            "Content-Type": "application/json",
            "X-Verified-Principal": JSON.stringify({ // guard:allow-principal
              uid: ctx.uid,
              email: ctx.email,
              role: ctx.role,
              db_target: ctx.db_target || "fahem",
              selected_book_ids: selected_book_ids || [],
              selected_text: selected_text || undefined,
              book_id: book_id || undefined,
              page: page || undefined
            })
          };
          if (oidcToken) {
            requestHeaders["Authorization"] = `Bearer ${oidcToken}`;
            controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM LOG] Secured authenticated GCP ID token.\n`));
          } else {
            controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM LOG] Running in local/dev environment mode. Identity forwarded securely.\n`));
          }

          const payload = {
            app_name: onboarding ? "onboarding_agent" : "app",
            user_id: userId || "anonymous",
            session_id: activeSessionId,
            new_message: {
              role: "user",
              parts: [{ text: prompt }]
            },
            streaming: true,
            selected_book_ids: selected_book_ids || [],
            selected_text: selected_text || undefined,
            book_id: book_id || undefined,
            page: page || undefined
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

          const decoder = new TextDecoder();
          let lineBuffer = "";
          let finalResponseText = "";
          let hasStartedFinalOutput = false;
          let currentActiveAgent = "";
          let capturedIntent: any = null;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
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
                      // Deterministically capture a create/navigate intent from the tool RESULT so the
                      // frontend action fires even if the model forgets to echo the [INTENT] token.
                      if (part.functionResponse || part.function_response) {
                        const fr = part.functionResponse || part.function_response;
                        const raw = (fr && fr.response) || {};
                        // ADK may pass the tool dict directly or wrapped as { result: {...} }.
                        const resp = (raw && raw.action) ? raw : (raw && raw.result) ? raw.result : raw;
                        if (resp && resp.action && resp.target &&
                            (resp.type === "write" || resp.action === "navigate" || String(resp.action).startsWith("create_"))) {
                          capturedIntent = { type: resp.type || "write", action: resp.action, target: resp.target };
                        }
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
                        if (part.thought) {
                          continue; // skip thoughts
                        }
                        if (part.text) {
                          textChunk += part.text;
                        }
                      }

                      if (textChunk) {
                        if (!hasStartedFinalOutput) {
                          controller.enqueue(encoder.encode("\n=== Agent Final Output ===\n"));
                          hasStartedFinalOutput = true;
                        }
                        const cleanedChunk = cleanFabricatedUrls(textChunk);
                        finalResponseText += cleanedChunk;
                        controller.enqueue(encoder.encode(cleanedChunk));
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
                      const cleanedFallback = cleanFabricatedUrls(fallbackText);
                      finalResponseText += cleanedFallback;
                      controller.enqueue(encoder.encode(cleanedFallback));
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
                    if (part.thought) {
                      continue; // skip thoughts
                    }
                    if (part.text) {
                      textChunk += part.text;
                    }
                  }
                  if (textChunk) {
                    if (!hasStartedFinalOutput) {
                      controller.enqueue(encoder.encode("\n=== Agent Final Output ===\n"));
                      hasStartedFinalOutput = true;
                    }
                    const cleanedChunk = cleanFabricatedUrls(textChunk);
                    finalResponseText += cleanedChunk;
                    controller.enqueue(encoder.encode(cleanedChunk));
                  }
                }
              }
            } catch (e) {}
          }

          // Deterministic intent injection: if a create/navigate tool returned an intent but the
          // model did not echo the [INTENT] token, append it now so the action still fires reliably.
          if (capturedIntent && !finalResponseText.includes("[INTENT:")) {
            if (!hasStartedFinalOutput) {
              controller.enqueue(encoder.encode("\n=== Agent Final Output ===\n"));
              hasStartedFinalOutput = true;
            }
            controller.enqueue(encoder.encode(` [INTENT: ${JSON.stringify(capturedIntent)}]`));
          }

          // Close markers
          if (hasStartedFinalOutput) {
            controller.enqueue(encoder.encode("\n==========================\n"));
          }
          controller.enqueue(encoder.encode("[METADATA] ActiveAgent: Done\n"));
          controller.enqueue(encoder.encode(`\n[CLOSE] Execution complete.\n`));

          // -------------------------------------------------------------
          // STEP 4: Session, Chat, Activity, and Token Logging
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
                const res = await proxyRequest(`/user/chat-session/detail?sessionId=${activeSessionId}`, "GET", undefined, ctx);
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
            // Auto-name a new chat from what it is about (the first user message), stripping any
            // bracketed system/context/intent markers so the title is clean. Never overwrite an
            // existing title, so a user-chosen name is preserved.
            const cleanPromptForTitle = (prompt || "")
              .replace(/\[(?:Grounded Web Search Request|Context Reference|Page Content|SYSTEM[^\]]*|INTENT[^\]]*)\][^\n]*/gi, "")
              .replace(/\s+/g, " ")
              .trim();
            const title = onboarding
              ? "Onboarding Chat Session"
              : isNewSession
                ? (cleanPromptForTitle.length > 40 ? cleanPromptForTitle.substring(0, 40) + "..." : (cleanPromptForTitle || "New Chat"))
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
                }, ctx);
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
                model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
                type: onboarding ? "onboarding_agent" : "standard_orchestrator"
              }, ctx);
            } catch (err) {
              console.warn("Failed to log token telemetry:", err);
            }

            // E. Log User Activity
            try {
              await proxyRequest("/user/activity", "POST", {
                userId,
                userEmail,
                action: onboarding ? "Onboarding Agent Query" : "Standard Agent Query",
                status: "SUCCESS",
                details: prompt.substring(0, 150)
              }, ctx);
            } catch (err) {
              console.warn("Failed to log user activity:", err);
            }
          }

        } catch (err: any) {
          console.error("[agent-api] Orchestration failed:", err);
          controller.enqueue(encoder.encode(`\n[ERROR] Orchestration failed: ${err.message}\n`));
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

