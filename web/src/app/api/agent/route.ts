import { NextRequest } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { proxyRequest, getOidcToken } from "../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb, resolveScriptPath, shouldSkipDirectMongo, checkFocusLockLocal } from "../localDbHelper";
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
      if (shouldSkipDirectMongo()) {
        throw new Error("Direct database connections skipped on App Hosting Serverless");
      }
      const { MongoClient } = require("mongodb");
      const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
      await client.connect();
      const db = client.db("fahem");
      const job = await db.collection("ingestion_jobs").findOne({ _id: jobId });
      await client.close();
      return job || null;
    } catch (e) {
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
      console.warn(`Model Armor API returned error status ${res.status}: ${errText}`);
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
    const { prompt, language, sessionId, onboarding, recaptchaToken } = body;
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

          // -------------------------------------------------------------
          // Secret Superadmin Ingestion Commands Interception
          // -------------------------------------------------------------
          const isAdmin = ctx.role === "admin" || ctx.role === "super-admin";
          const isSuper = ctx.role === "super-admin";
          
          const urlRegex = /(?:^|\s|\/)?ingest\s+url\s+(https?:\/\/\S+)/i;
          const pdfRegex = /(?:^|\s|\/)?ingest\s+(?:pdf|uploaded\s+pdf|file)\s+(\S+)/i;
          
          const matchUrl = prompt.match(urlRegex);
          const matchPdf = prompt.match(pdfRegex);
          
          if ((isAdmin || isSuper) && (matchUrl || matchPdf)) {
            if (matchUrl && !isSuper) {
              controller.enqueue(encoder.encode("[METADATA] ActiveAgent: System\n"));
              controller.enqueue(encoder.encode("[Fahem Agent] [SYSTEM] 🔐 ACCESS DENIED.\n"));
              controller.enqueue(encoder.encode(
                language === "ar"
                  ? "❌ عذرًا، سحب الروابط متاح فقط للمشرفين الخارقين (Superadmins). كمشرف معتمد، يمكنك رفع ملفات المنهج وطلب فهرستها مباشرة.\n"
                  : "❌ URL ingestion is strictly restricted to Superadmins. As an approved admin, you are permitted to upload and ingest local files directly.\n"
              ));
              controller.close();
              return;
            }

            controller.enqueue(encoder.encode("[METADATA] ActiveAgent: Superadmin Ingest\n"));
            controller.enqueue(encoder.encode("[Fahem Agent] [SYSTEM] 🔐 SECRET COMPANION INGESTION SYSTEM ACTIVATED.\n"));
            controller.enqueue(encoder.encode(
              isSuper
                ? `[Fahem Agent] [SYSTEM] User [${userEmail}] verified as authorized Superadmin.\n`
                : `[Fahem Agent] [SYSTEM] User [${userEmail}] verified as approved Administrator.\n`
            ));
            
            let resolvedSourceUrl = "";
            let resolvedStoragePath = "";
            let resolvedTitle = "";
            
            if (matchUrl) {
              resolvedSourceUrl = matchUrl[1];
              // Extract filename from URL
              let filename = "url_ingested_resource.pdf";
              try {
                const parsedUrl = new URL(resolvedSourceUrl);
                const pathname = parsedUrl.pathname;
                const base = pathname.substring(pathname.lastIndexOf('/') + 1);
                if (base && base.endsWith(".pdf")) {
                  filename = base;
                }
              } catch (e) {}
              
              resolvedTitle = filename
                .replace(/\.pdf$/i, "")
                .replace(/[-_]/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
                
              controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM] Target Type: Public URL Crawl/Harvest\n`));
              controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM] Target URL: ${resolvedSourceUrl}\n`));
            } else if (matchPdf) {
              const filename = matchPdf[1];
              resolvedStoragePath = filename; // This could be full storage path or filename
              resolvedTitle = path.basename(filename)
                .replace(/\.pdf$/i, "")
                .replace(/[-_]/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
                
              controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM] Target Type: Direct Uploaded PDF File\n`));
              controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM] Storage Path: ${resolvedStoragePath}\n`));
            }
            
            const bookId = "book_ingest_" + resolvedTitle.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
            const jobId = `job_${bookId}`;
            const resolvedSubjectId = "subj_user_uploads";
            
            controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM] Book ID generated: ${bookId}\n`));
            controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM] Subject category maps to: ${resolvedSubjectId}\n`));
            controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM] Initiating database handshake and state machine registration...\n`));
            
            const initialLogs = [
              `[INIT] Ingestion container spawned via Secret Companion Command.`,
              `[INIT] Awaiting direct binary pipeline allocation...`,
              `[DOWNLOAD] Queuing resource: ${resolvedSourceUrl || resolvedStoragePath}`
            ];

            const draftBook: any = {
              _id: bookId,
              subject_id: resolvedSubjectId,
              title: resolvedTitle,
              title_ar: resolvedTitle,
              grade: "General",
              term: "Term 1",
              year: new Date().getFullYear().toString(),
              language: "ar",
              book_type: "core",
              source_url: resolvedSourceUrl,
              storage_path: resolvedStoragePath,
              chapters: [],
              is_downloaded: true,
              is_indexed: false,
              is_vectored: false,
              is_embedded: false,
              is_analyzed: false,
              is_extracted: false,
              is_processed: false,
              is_completed: false,
              total_pages: 0,
              last_processed_page: 0,
              extracted_pages_count: 0,
              userId: userId || null,
              sizeBytes: 0,
              size_bytes: 0,
              needs_approval: false,
              ingestion_status: "queued",
              ingestion_progress: 5,
              ingestion_logs: initialLogs,
              processed_pages: 0,
              created_at: Date.now() / 1000,
              updated_at: Date.now() / 1000
            };

            const draftJob: any = {
              _id: jobId,
              status: "queued",
              current_step: "fetch",
              progress: 5,
              logs: initialLogs,
              processed_pages: 0,
              total_pages: 0,
              is_completed: false,
              updated_at: Date.now() / 1000,
              created_at: Date.now() / 1000,
              metadata: {
                book_id: bookId,
                subject_id: resolvedSubjectId,
                title: resolvedTitle,
                title_ar: resolvedTitle,
                source_url: resolvedSourceUrl,
                storage_path: resolvedStoragePath,
                grade: "General",
                term: "Term 1",
                year: new Date().getFullYear().toString(),
                language: "ar",
                book_type: "core",
                userId: userId || null
              }
            };
            
            // Write initial state to local/mongo
            if (isLocalEnv()) {
              const db = getLocalDb() as any;
              
              // Ensure subjects has resolvedSubjectId
              let subjectIdx = db.subjects.findIndex((subj: any) => subj._id === resolvedSubjectId);
              if (subjectIdx < 0) {
                db.subjects.push({
                  _id: resolvedSubjectId,
                  name: "User Uploaded Documents",
                  name_ar: "مستندات مرفوعة",
                  grade_level: "General",
                  category: "General",
                  emoji: "📁",
                  books_count: 0
                });
                subjectIdx = db.subjects.length - 1;
              }
              
              db.books = db.books || [];
              db.books.push(draftBook);
              db.subjects[subjectIdx].books_count = (db.subjects[subjectIdx].books_count || 0) + 1;
              
              db.ingestion_jobs = db.ingestion_jobs || [];
              db.ingestion_jobs.push(draftJob);
              saveLocalDb(db);
            } else {
              try {
                if (shouldSkipDirectMongo()) {
                  throw new Error("Direct database connections skipped on App Hosting Serverless");
                }
                const { MongoClient } = require("mongodb");
                const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
                const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
                await client.connect();
                const db = client.db("fahem");
                await db.collection("books").updateOne({ _id: bookId }, { $set: draftBook }, { upsert: true });
                await db.collection("ingestion_jobs").updateOne({ _id: jobId }, { $set: draftJob }, { upsert: true });
                await client.close();
              } catch (mongoErr) {
                console.error("[agent-route] MongoDB initialization failed:", mongoErr);
              }
            }
            
            controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM] Database records registered successfully.\n`));
            controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM] Spawning asynchronous multi-job Python ingestion script...\n`));
            
            // Spawn Process
            try {
              const pythonPath = "python";
              const scriptPath = resolveScriptPath(path.join("ingestion_v2", "job_fetch.py"));

              const payload = {
                book_id: bookId,
                subject_id: resolvedSubjectId,
                title: resolvedTitle,
                title_ar: resolvedTitle,
                source_url: resolvedSourceUrl,
                storage_path: resolvedStoragePath,
                grade: "General",
                term: "Term 1",
                year: "2026",
                language: "ar",
                book_type: "core",
                is_private: !!userId,
                userId: userId || null,
                is_local: isLocalEnv()
              };

              const child = spawn(pythonPath, [scriptPath], { env: process.env });
              global.activeBookJobs?.set(bookId, child);

              child.stdin.write(JSON.stringify(payload));
              child.stdin.end();

              child.stdout.on("data", (data) => {
                console.log(`[Superadmin Ingest stdout] ${data}`);
              });
              child.stderr.on("data", (data) => {
                console.error(`[Superadmin Ingest stderr] ${data}`);
              });
              child.on("close", (code) => {
                global.activeBookJobs?.delete(bookId);
                console.log(`[Superadmin Ingest Child Process] Book ${bookId} exited with code ${code}`);
              });
              
              controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM] Async multi-job pipeline spawned with PID ${child.pid}.\n`));
            } catch (spawnErr: any) {
              controller.enqueue(encoder.encode(`[Fahem Agent] [CRITICAL] Child process spawn failed: ${spawnErr.message}\n`));
              safeClose();
              return;
            }
            
            // Now enter the monitoring loop!
            controller.enqueue(encoder.encode("\n=== Agent Final Output ===\n"));
            controller.enqueue(encoder.encode(`### 🚀 Ingestion Started for **${resolvedTitle}**\n`));
            controller.enqueue(encoder.encode(`* **Book ID**: \`${bookId}\`\n`));
            controller.enqueue(encoder.encode(`* **Job ID**: \`${jobId}\`\n\n`));
            controller.enqueue(encoder.encode(`Monitoring real-time progress page-by-page. Please standby...\n\n`));
            
            let lastProgress = -1;
            let lastStep = "";
            let lastLogCount = 0;
            let checkCount = 0;
            const maxChecks = 400; // safe timeout ceiling (approx 10 minutes)
            
            while (checkCount < maxChecks) {
              await new Promise(resolve => setTimeout(resolve, 1500));
              checkCount++;
              
              const job = await getJobMetadata(jobId);
              if (!job) {
                continue;
              }
              
              const stepName = job.current_step || "fetch";
              const progressVal = job.progress || 0;
              const logsArr = job.logs || [];
              const statusStr = job.status || "queued";
              
              // Print any new logs
              if (logsArr.length > lastLogCount) {
                const newLogs = logsArr.slice(lastLogCount);
                for (const logLine of newLogs) {
                  controller.enqueue(encoder.encode(`\`${logLine}\`\n`));
                }
                lastLogCount = logsArr.length;
              }
              
              if (progressVal !== lastProgress || stepName !== lastStep) {
                let stepEmoji = "⏳";
                if (stepName === "ocr") stepEmoji = "👁️";
                if (stepName === "embed") stepEmoji = "🧠";
                if (stepName === "finalize") stepEmoji = "💾";
                
                controller.enqueue(encoder.encode(`\n${stepEmoji} **[Progress: ${progressVal}%] [Active Step: ${stepName.toUpperCase()}]** (${job.processed_pages || 0}/${job.total_pages || 0} pages processed)\n`));
                
                lastProgress = progressVal;
                lastStep = stepName;
              }
              
              if (statusStr === "completed" || job.is_completed) {
                controller.enqueue(encoder.encode(`\n✅ **Ingestion Completed Successfully!**\n`));
                controller.enqueue(encoder.encode(`The textbook **${resolvedTitle}** is now fully active, semantic text vector embeddings are fully stored in the MongoDB Atlas database cluster, and subjects metadata has been synced! 🎓\n`));
                break;
              }
              
              if (statusStr === "failed" || statusStr === "killed" || statusStr === "stopped") {
                controller.enqueue(encoder.encode(`\n❌ **Ingestion Aborted!**\n`));
                controller.enqueue(encoder.encode(`The background worker reported status \`${statusStr}\`. Please check server-side diagnostics or try again.\n`));
                break;
              }
            }
            
            if (checkCount >= maxChecks) {
              controller.enqueue(encoder.encode(`\n⚠️ **Monitoring Timeout**: The progress stream timed out after 10 minutes, but the background process may still be running. You can check the books dashboard for completion status.\n`));
            }
            
            controller.enqueue(encoder.encode("\n==========================\n"));
            controller.enqueue(encoder.encode("[METADATA] ActiveAgent: Done\n"));
            safeClose();
            return;
          }

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
            "X-Verified-Principal": JSON.stringify({
              uid: ctx.uid,
              email: ctx.email,
              role: ctx.role
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

          const decoder = new TextDecoder();
          let lineBuffer = "";
          let finalResponseText = "";
          let hasStartedFinalOutput = false;
          let currentActiveAgent = "";

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
                    }
                  }

                  // 4. Content / Text Streaming
                  if (event.content?.parts) {
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
            } catch (e) {}
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
            const title = onboarding
              ? "Onboarding Chat Session"
              : isNewSession 
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
                model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
                type: onboarding ? "onboarding_agent" : "standard_orchestrator"
              });
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
              });
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

