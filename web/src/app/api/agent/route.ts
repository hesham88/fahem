import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { GoogleAuth } from "google-auth-library";
import { proxyRequest, getOidcToken } from "../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb, resolveScriptPath, shouldSkipDirectMongo } from "../localDbHelper";
import { checkIsSuperadmin, checkIsAdmin } from "../admin/helper";
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
    const { prompt, language, userEmail, userId, sessionId, onboarding, recaptchaToken } = await req.json();
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
          const activeSessionId = sessionId || "sess_" + Date.now();

          // Stream the active session id to the frontend right away
          controller.enqueue(encoder.encode(`[METADATA] SessionId: ${activeSessionId}\n`));

          // -------------------------------------------------------------
          // Secret Superadmin Ingestion Commands Interception
          // -------------------------------------------------------------
          const isAdmin = userEmail ? await checkIsAdmin(userEmail) : false;
          const isSuper = userEmail ? await checkIsSuperadmin(userEmail) : false;
          
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
              const scriptPath = resolveScriptPath(path.join("ingestion", "job_fetch.py"));

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

          if (onboarding) {
            controller.enqueue(encoder.encode("[METADATA] ActiveAgent: Onboarding\n"));
            controller.enqueue(encoder.encode("[Fahem Agent] [SYSTEM LOG] Running conversational onboarding agent...\n"));

            // Initialize local Gemini AI client
            const geminiApiKey = process.env.GEMINI_API_KEY;
            if (!geminiApiKey) {
              throw new Error("GEMINI_API_KEY environment variable is not configured.");
            }
            const ai = new GoogleGenAI({ apiKey: geminiApiKey });
            const modelName = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

            const activeSessionId = sessionId || `onboarding_session_${userId || "anonymous"}`;

            // 1. Fetch chat history from DB to maintain conversational context
            let existingMessages: any[] = [];
            try {
              console.log(`[Onboarding API] Fetching existing session history for: ${activeSessionId}`);
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
              console.log(`[Onboarding API] Session history load complete. Found ${existingMessages.length} existing messages.`);
            } catch (err) {
              console.warn("Failed to fetch existing session for onboarding:", err);
            }

            // 2. Map existing messages to Gemini format (note: Gemini uses "model" instead of "assistant")
            const contents: any[] = existingMessages.map(msg => ({
              role: msg.role === "assistant" || msg.role === "model" ? "model" as const : "user" as const,
              parts: [{ text: msg.content || msg.text || "" }]
            }));

            // Append new user prompt
            contents.push({
              role: "user" as const,
              parts: [{ text: prompt }]
            });

            // 3. Define local validated tools for checking username and saving profiles
            const tools: any[] = [
              {
                functionDeclarations: [
                  {
                    name: "checkUsernameAvailability",
                    description: "Checks if a username is available in the database. Returns true if available (not taken), false if already taken.",
                    parameters: {
                      type: "OBJECT" as const,
                      properties: {
                        username: { type: "STRING" as const, description: "The username to check." }
                      },
                      required: ["username"]
                    }
                  },
                  {
                    name: "saveUserProfile",
                    description: "Saves or updates the user profile in MongoDB. Call this once ALL required onboarding fields (phone, role, name, username, age, country, grade/school/children, and avatar if applicable) have been collected and verified.",
                    parameters: {
                      type: "OBJECT" as const,
                      properties: {
                        userId: { type: "STRING" as const, description: "The unique user identifier." },
                        profileData: {
                          type: "OBJECT" as const,
                          description: "The JSON object containing the profile fields to save.",
                          properties: {
                            username: { type: "STRING" as const },
                            email: { type: "STRING" as const },
                            name: { type: "STRING" as const },
                            role: { type: "STRING" as const },
                            age: { type: "INTEGER" as const },
                            parentEmail: { type: "STRING" as const },
                            country: { type: "STRING" as const },
                            grade: { type: "STRING" as const },
                            school: { type: "STRING" as const },
                            avatar: { type: "STRING" as const },
                            childrenCount: { type: "INTEGER" as const },
                            childrenInSchool: { type: "INTEGER" as const },
                            phoneNumber: { type: "STRING" as const },
                            phoneVerified: { type: "BOOLEAN" as const },
                            onboardingCompleted: { type: "BOOLEAN" as const }
                          },
                          required: ["username", "email", "name", "role", "age", "country", "phoneNumber"]
                        }
                      },
                      required: ["userId", "profileData"]
                    }
                  }
                ]
              }
            ];

            const onboardingSystemInstruction = `
You are the Fahem Conversational Onboarding Assistant.
Your sole goal is to naturally, warmly, and politely onboard a new user into the Fahem platform.

The user has selected their preferred language as '${langName}' (from the 7 languages we support: English, Arabic, French, German, Spanish, Italian, and Chinese).
You MUST speak, respond, and formulate all questions, validation feedback, and welcoming statements strictly and exclusively in '${langName}' at all times. Do NOT randomly switch languages or translate things into other languages.

The current user's authenticated ID is '${userId || "anonymous"}' and their email is '${userEmail || ""}'.
Your tone must be highly empathetic, friendly, premium, and human-like.

CONVERSATIONAL STATE CHECKLIST & PROTOCOL:
You must analyze the entire conversation history from the very beginning to build a checklist of what fields have already been provided.
A field is "COLLECTED" if there is ANY mention or clear implication of it in the chat history. Once a field is "COLLECTED", you must NEVER ask for it again or backtrack to it, regardless of what language the user changes to!

Here are the fields to collect in order, along with how to recognize if they are already COLLECTED:
0. **Phone Number (Step 0 - MANDATORY)**: The user's phone number has been verified client-side via Firebase SMS link auth before the conversational flow starts.
   - How to recognize if COLLECTED: You will see a system log message like '[SYSTEM] Phone number verified: <phone_number>' at the very beginning of the chat log.
   - Action if COLLECTED: Mark as COLLECTED. You MUST extract this phone number and pass it as 'phoneNumber' and 'phoneVerified: true' in 'profileData' when calling the 'saveUserProfile' tool. Never ask the user for their phone number since it is already verified!
1. **Role / User Type**: Must be "student", "teacher", "parent", or "admin".
   - How to recognize if COLLECTED: The user has said "student", "طالب", "معلم", "teacher", "parent", "ولي أمر", "admin", "مسؤول", or chose a card representing one.
   - Action if COLLECTED: Mark as COLLECTED. Never ask "What is your role?" or "Are you joining as student, teacher...?" again.
2. **Full Name**: The user's real or preferred name.
   - How to recognize if COLLECTED: The user has said their name (e.g. "my name is Hesham", "اسمى هشام", "Hesham", "هشام").
   - Action if COLLECTED: Mark as COLLECTED. Never ask "What is your name?" again. Use their name in greeting.
3. **Username**: A unique identifier (at least 3 characters, alphanumeric or underscores).
   - Action: Ask the user to choose a username.
   - CRITICAL: Once the user suggests a username, you MUST call 'checkUsernameAvailability' to verify if it is available.
     - If the tool returns available = true, tell them it is available and move to the next field (Mark Username as COLLECTED).
     - If the tool returns available = false, politely inform them it's taken, suggest 1 or 2 options, and ask for a different one.
4. **Age**: The user's age (must be a realistic human age between 3 and 120).
   - If they provide an invalid or unrealistic age (e.g., 0, 1, 2, or >120), politely ask for a realistic age.
   - Special Rule: If Role is "student" and Age is under 13 (< 13), you MUST ask for their parent's email address and save it in 'parentEmail'.
5. **Country**: The user's country (e.g., Egypt, Saudi Arabia, etc.).
6. **Educational Grade Level** (Only if role is 'student'):
   - How to recognize if COLLECTED: The user has chosen a grade level (either by accepting the recommendation via 'Accept recommended grade', 'Accept', 'قبول المسار المقترح', or typing a custom grade, selecting lifelong learning, or skipping).
   - Action: If role is 'student', you MUST recommend a standard school grade based on their age and country of residence using the **Exact Grade Prediction Formula** below:
     - **Exact Grade Prediction Formula**:
       - If Age < 4: Recommended Grade is 'Preschool / Toddler 👶' (or 'مرحلة الحضانة 👶' in Arabic)
       - If Age is 4 or 5: Recommended Grade is 'Kindergarten / Preschool 🧸' (or 'مرحلة الروضة / التمهيدي 🧸' in Arabic)
       - If Age >= 18: Recommended Grade is 'University Student / Lifelong Learner 🎓' (or 'طالب جامعي / متعلم مدى الحياة 🎓' in Arabic)
       - If Age is between 6 and 17 inclusive:
         - Calculate Grade Number as Age - 5.
         - If Country is 'Egypt' (or 'مصر'):
           - If Age is 6 to 11: Recommended Grade is 'الصف الأول الابتدائي' (for 6), 'الصف الثاني الابتدائي' (for 7), 'الصف الثالث الابتدائي' (for 8), 'الصف الرابع الابتدائي' (for 9), 'الصف الخامس الابتدائي' (for 10), 'الصف السادس الابتدائي' (for 11)
           - If Age is 12 to 14: Recommended Grade is 'الصف الأول الإعدادي' (for 12), 'الصف الثاني الإعدادي' (for 13), 'الصف الثالث الإعدادي' (for 14)
           - If Age is 15 to 17: Recommended Grade is 'الصف الأول الثانوي' (for 15), 'الصف الثاني الثانوي' (for 16), 'الصف الثالث الثانوي' (for 17)
         - If Country is in the Gulf region (Saudi Arabia, UAE, Qatar, Kuwait, Oman) or other Arabic countries:
           - If Age is 6 to 11: Recommended Grade is 'الصف الأول الابتدائي' (for 6), 'الصف الثاني الابتدائي' (for 7), 'الصف الثالث الابتدائي' (for 8), 'الصف الرابع الابتدائي' (for 9), 'الصف الخامس الابتدائي' (for 10), 'الصف السادس الابتدائي' (for 11)
           - If Age is 12 to 14: Recommended Grade is 'الصف الأول المتوسط' (for 12), 'الصف الثاني المتوسط' (for 13), 'الصف الثالث المتوسط' (for 14)
           - If Age is 15 to 17: Recommended Grade is 'الصف الأول الثانوي' (for 15), 'الصف الثاني الثانوي' (for 16), 'الصف الثالث الثانوي' (for 17)
         - For all other countries:
           - If Age is 6 to 11: Recommended Grade is 'Grade ' + Grade Number + ' (Primary)'
           - If Age is 12 to 14: Recommended Grade is 'Grade ' + Grade Number + ' (Middle/Prep)'
           - If Age is 15 to 17: Recommended Grade is 'Grade ' + Grade Number + ' (Secondary/High)'
   - If the user says 'Accept recommended grade', 'Accept', or 'قبول المسار المقترح', or selects the recommendation chip, you MUST interpret this as accepting the Recommended Grade computed from the formula above, and save that exact Recommended Grade string in the 'grade' parameter of 'saveUserProfile'.
   - If they specify a custom grade, save their custom grade string in the 'grade' parameter.
   - If they select 'lifelong learning' or 'متعلم مدى الحياة', save 'Lifelong Learner' or 'متعلم مدى الحياة' in the 'grade' parameter.
   - If they choose to skip, save 'Skipped' in the 'grade' parameter.
7. **School Name** (Only if role is "student" or "teacher"):
   - Ask for their school name. They can type it or search. They can specify "Home school" / "None" / "Skip".
8. **Children Count & Children in School Count** (Only if role is "parent" or "teacher"):
   - Ask how many children they have and how many of them are in school.
9. **Avatar**: Ask the user to choose an avatar/emoji to complete their profile. This is mandatory for ALL users (students, teachers, parents, admins).
   - Once they pick their avatar, proceed directly to save the profile.

CRITICAL BEHAVIORAL PROTOCOLS:
- **NO LOOPS**: Keep moving forward. If Role is collected, move to Name. If Name is collected, move to Username. If Username is collected, move to Age, and so on. Never repeat a question or ask for information you already have.
- **LANGUAGE HARMONY**: Speak in the language of the user's latest input. If they write in English, respond in natural English. If they write in Arabic, respond in natural Arabic. Do NOT mix languages in a single message.
- **NATURAL TRANSITIONS**: Use smooth, conversational transitions. (e.g. "Perfect, Hesham! Since you are a student, let's now select a unique username...").
- **NO TECHNICAL OR SCHEMA DISCLOSURES**: Do not mention tools, MongoDB, JSON, collections, or fields. Talk like a friendly human companion guide.
- **SAVE PROFILE**: Once ALL required fields for the user's chosen role (including their selected avatar!) have been successfully collected and verified, you MUST call 'saveUserProfile' with the gathered information.
- Ensure 'onboardingCompleted' is set to true in the profileData parameter.
- After 'saveUserProfile' returns success, write a beautiful, warm final welcoming message indicating that their custom learning space is set up and they are ready to explore.
- **CRITICAL COMPLETION TOKEN**: You MUST append the exact word "SUCCESS_ONBOARDING_COMPLETE" at the very end of your final response after the profile has been successfully saved. This token is required for the platform to proceed.

METADATA STATE SYNCHRONIZATION:
At the very end of EVERY single assistant response, you MUST append a synchronization metadata tag on a new line, containing a JSON payload of the current onboarding state:
[METADATA] state: {"step": "<current_step_name>", "role": "<collected_role_or_empty>", "country": "<collected_country_or_empty>", "name": "<collected_name_or_empty>", "username": "<collected_username_or_empty>", "age": "<collected_age_or_empty>", "grade": "<collected_grade_or_empty>"}

Replace the placeholders with the actual values collected so far (or empty string if not yet collected).
The "step" field must be one of the following exact string values representing the field you are currently asking for:
- "role" (if asking for user type / role)
- "name" (if asking for full name)
- "username" (if asking for username)
- "age" (if asking for age)
- "parentEmail" (if student and age < 13 and asking for parental email)
- "country" (if asking for country of residence)
- "grade" (if student and asking for grade level)
- "school" (if student or teacher and asking for school name)
- "children" (if parent and asking for children count)
- "childrenInSchool" (if parent and asking for children in school count)
- "avatar" (if asking for avatar selection)
- "complete" (if onboarding is completed successfully)

Examples:
- [METADATA] state: {"step": "name", "role": "student", "country": "", "name": "", "username": "", "age": "", "grade": ""}
- [METADATA] state: {"step": "country", "role": "student", "country": "", "name": "Hesham", "username": "hesham123", "age": "15", "grade": ""}
- [METADATA] state: {"step": "avatar", "role": "student", "country": "Egypt", "name": "Hesham", "username": "hesham123", "age": "15", "grade": "الصف الأول الثانوي"}
`;

            // Call Gemini
            let response = await ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                systemInstruction: onboardingSystemInstruction,
                tools
              }
            });

            // Loop to handle function calls dynamically
            let loops = 0;
            while (response.candidates?.[0]?.content?.parts?.some(p => p.functionCall) && loops < 5) {
              loops++;
              const parts = response.candidates[0].content.parts;
              
              // Add the model's response (containing function calls) to history
              contents.push({
                role: "model" as const,
                parts
              });

              const responseParts: any[] = [];

              for (const part of parts) {
                if (part.functionCall) {
                  const { name, args } = part.functionCall;
                  console.log(`[Onboarding Agent] Executing tool call: ${name} with args:`, args);

                  let result: any;
                  if (name === "checkUsernameAvailability") {
                    const checkUsername = (args as any).username;
                    try {
                      const checkRes = await proxyRequest(`/user/username/check?username=${encodeURIComponent(checkUsername)}`, "GET");
                      if (checkRes.ok) {
                        const checkData = await checkRes.json();
                        result = { available: checkData.available };
                      } else {
                        result = { available: false, error: "Check endpoint returned error" };
                      }
                    } catch (err: any) {
                      result = { available: false, error: err.message };
                    }
                  } else if (name === "saveUserProfile") {
                    const uId = (args as any).userId;
                    const profileData = (args as any).profileData;
                    if (profileData && typeof profileData === "object") {
                      profileData.onboardingCompleted = true;
                    }
                    try {
                      const saveRes = await proxyRequest("/user/profile", "POST", {
                        userId: uId,
                        profile: profileData
                      });
                      if (saveRes.ok) {
                        result = { success: true, message: "Profile saved successfully." };
                      } else {
                        const errText = await saveRes.text();
                        result = { success: false, error: `Save endpoint failed: ${errText}` };
                      }
                    } catch (err: any) {
                      result = { success: false, error: err.message };
                    }
                  }

                  responseParts.push({
                    functionResponse: {
                      name,
                      response: result
                    }
                  });
                }
              }

              // Add function responses to history
              contents.push({
                role: "user" as const,
                parts: responseParts
              });

              // Generate next response from model
              response = await ai.models.generateContent({
                model: modelName,
                contents,
                config: {
                  systemInstruction: onboardingSystemInstruction,
                  tools
                }
              });
            }

            // Get final text response
            const finalText = response.text || "";

            // Save new messages to DB
            const newMessages = [
              ...existingMessages,
              { role: "user", content: prompt, timestamp: new Date().toISOString() },
              { role: "assistant", content: finalText, timestamp: new Date().toISOString() }
            ];

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
                    messages: newMessages,
                    updatedAt: now
                  };
                } else {
                  db.chat_sessions.push({
                    sessionId: activeSessionId,
                    userId,
                    userEmail,
                    title: "Onboarding Chat Session",
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
                  title: "Onboarding Chat Session",
                  messages: newMessages
                });
              }
            } catch (err) {
              console.warn("Failed to save onboarding session history:", err);
            }

            // Stream final response to client using chunked simulation
            controller.enqueue(encoder.encode("\n=== Agent Final Output ===\n"));
            const chunkSize = 20;
            for (let i = 0; i < finalText.length; i += chunkSize) {
              controller.enqueue(encoder.encode(finalText.substring(i, i + chunkSize)));
              await new Promise(resolve => setTimeout(resolve, 15));
            }
            controller.enqueue(encoder.encode("\n==========================\n"));
            controller.enqueue(encoder.encode("[METADATA] ActiveAgent: Done\n"));

            safeClose();
            return;
          }

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
4. **Data Context and Database Inspection Isolation**: Prevent standard users from listing database collections, examining/checking schemas, reading system/database statistics, or reading or querying profiles of other users. Standard users must never be allowed to access these technical database internals or telemetry. These features are strictly reserved for authorized administrators / superadmins. If a standard user attempts to run any database diagnostic, telemetry, schema check, collection listing, or searches for another user's profile, immediately deny the request with an appropriate message.

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
            let oidcToken = await getOidcToken();
            let isLocalBypass = false;
            if (!oidcToken) {
              oidcToken = "LOCAL_BYPASS_TOKEN_fahem_2026";
              isLocalBypass = true;
            }

            const requestHeaders: Record<string, string> = {
              "Content-Type": "application/json"
            };
            if (oidcToken) {
              requestHeaders["Authorization"] = `Bearer ${oidcToken}`;
              if (isLocalBypass) {
                controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM LOG] Secured local development bypass credentials.\n`));
              } else {
                controller.enqueue(encoder.encode(`[Fahem Agent] [SYSTEM LOG] Secured authenticated GCP ID token.\n`));
              }
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
              body: JSON.stringify(payload),
              cache: "no-store",
              next: { revalidate: 0 } as any
            });

            const dbEnd = performance.now();
            const dbDuration = ((dbEnd - dbStart) / 1000).toFixed(2);

            if (response.ok) {
              const resData: any = await response.json();
              databaseResults = extractFinalAgentOutput(resData);
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

The user's selected preferred language is '${langName}' (one of the 7 supported languages: English, Arabic, French, German, Spanish, Italian, and Chinese).
You MUST respond, present, and explain everything strictly and exclusively in '${langName}'.

When compiling database output results:
1. Avoid raw JSON or BSON dumps.
2. Construct highly professional, premium Markdown tables, lists, or structured cards.
3. Localize explanations, text, table headers, and statuses fully into the user's selected language: '${langName}'.
4. Preserve technical names such as collection names, database names, or specific keys as-is.

When presenting a security denial message:
1. Explain politely in the user's selected language ('${langName}') that security guardrails blocked the execution.
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

          const normalizedPrompt = prompt.toLowerCase();
          const adminKeywords = ["database", "collection", "schema", "mongodb", "stats", "audit", "user profile", "retrieve user", "trend analysis", "diagnostics", "diagnostic report", "mcp"];
          const arAdminKeywords = ["قاعدة بيانات", "مجموعات", "مجموعة", "مخطط", "احصائيات", "تقرير تشخيصي", "سجلات", "تشخيص"];
          const isAdminQuery = adminKeywords.some(w => normalizedPrompt.includes(w)) || arAdminKeywords.some(w => normalizedPrompt.includes(w));

          const orchStart = performance.now();
          let finalResponseText = "";

          // Signal start of final output to the frontend parser
          controller.enqueue(encoder.encode("\n=== Agent Final Output ===\n"));

          if (isConfirmed && executionSuccess && !isAdminQuery) {
            // Stream the academic tutor output directly to preserve natural human warmth and format
            const chunkSize = 25;
            for (let i = 0; i < databaseResults.length; i += chunkSize) {
              const chunk = databaseResults.substring(i, i + chunkSize);
              finalResponseText += chunk;
              controller.enqueue(encoder.encode(chunk));
              await new Promise(resolve => setTimeout(resolve, 8)); // dynamic streaming feel
            }
          } else {
            // For admin queries or security denials, format via Orchestrator as usual
            const responseStream = await ai.models.generateContentStream({
              model: modelName,
              contents: presentationPrompt,
              config: {
                systemInstruction: orchestratorSystemInstruction
              }
            });

            for await (const chunk of responseStream) {
              if (chunk.text) {
                finalResponseText += chunk.text;
                controller.enqueue(encoder.encode(chunk.text));
              }
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
              { role: "assistant", content: finalResponseText, timestamp: new Date().toISOString() }
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

