import { NextRequest } from "next/server";
import { checkIsAdmin, checkIsSuperadmin } from "../admin/helper";
import { proxyRequest } from "../proxy";
import { verifyAuth } from "../_auth";
import { isLocalEnv, getLocalDb, saveLocalDb, resolveScriptPath, shouldSkipDirectMongo, getDbTarget } from "../localDbHelper";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

function logToServerFile(message: string) {
  try {
    const logDir = path.join(process.cwd(), "ignore");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFilePath = path.join(logDir, "server_nextjs_api.log");
    const t = new Date().toISOString();
    fs.appendFileSync(logFilePath, `[${t}] ${message}\n`, "utf8");
  } catch (err) {
    console.error("Failed to write to local server log file:", err);
  }
}


async function translateMetadata(text: string): Promise<Record<string, string>> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return {
      en: text,
      ar: text,
      es: text,
      fr: text,
      de: text,
      zh: text,
      it: text
    };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    const prompt = `You are an elite multilingual academic translation assistant.
Translate this educational subject/book metadata string: "${text}"
into the following 7 languages: English (en), Arabic (ar), Spanish (es), French (fr), German (de), Chinese (zh), Italian (it).

Respond with a strictly formatted JSON object where the keys are the language codes (en, ar, es, fr, de, zh, it) and the values are the corresponding translations.
Only output the JSON object, do NOT include markdown syntax (e.g. \`\`\`json) or other text.`;

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
      throw new Error(`Gemini Translate Error: ${response.status}`);
    }

    const resJson = await response.json();
    const responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (responseText) {
      return JSON.parse(responseText.trim());
    }
  } catch (err) {
    console.error("[translateMetadata] Error:", err);
  }

  return {
    en: text,
    ar: text,
    es: text,
    fr: text,
    de: text,
    zh: text,
    it: text
  };
}


// Global map to hold references to running Python processes for book ingestion.
// This allows admins to safely terminate running ingestion jobs from the UI.
declare global {
  var activeBookJobs: Map<string, any> | undefined;
}

if (!global.activeBookJobs) {
  global.activeBookJobs = new Map();
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await verifyAuth(req);
    if (!ctx) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const bookId = searchParams.get("bookId");

    const isAdmin = ctx.role === "admin" || ctx.role === "super-admin";

    // 1. Local environment check
    if (isLocalEnv()) {
      const db = getLocalDb() as any;

      if (bookId) {
        const book = db.books?.find((b: any) => b._id === bookId || b.book_id === bookId);
        if (!book) {
          return new Response(JSON.stringify({ error: "Book not found locally" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        // IDOR Protection: Standard users cannot view other users' private uploads
        if (book.userId && book.userId !== ctx.uid && !isAdmin) {
          return new Response(JSON.stringify({ error: "Forbidden: You do not have permission to view this book" }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ success: true, book }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      let filteredBooks = db.books || [];
      // Filter out other users' private books
      filteredBooks = filteredBooks.filter((b: any) => !b.userId || b.userId === ctx.uid || isAdmin);
      if (subjectId) {
        filteredBooks = filteredBooks.filter((b: any) => b.subject_id === subjectId);
      }

      // Project out heavy fields like ingestion_logs, pages, chunks, content to reduce latency and payload size
      const projectedBooks = filteredBooks.map((b: any) => {
        const { ingestion_logs, pages, chunks, content, extracted_text, ...rest } = b;
        return rest;
      });

      return new Response(JSON.stringify({ success: true, books: projectedBooks }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!isLocalEnv()) {
      const params = new URLSearchParams();
      if (subjectId) params.append("subject_id", subjectId);
      if (bookId) params.append("book_id", bookId);

      return await proxyRequest(`/user/books?${params.toString()}`, "GET", undefined, ctx);
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await verifyAuth(req);
    if (!ctx) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const {
      subject_id,
      title,
      title_ar,
      grade,
      term,
      year,
      language,
      book_type,
      source_url,
      storage_path,
      chapters,
      storagePath,
      downloadUrl,
      sizeBytes,
      format,
      forceReindex = false
    } = body;

    const isAdmin = ctx.role === "admin" || ctx.role === "super-admin";
    const isSuper = ctx.role === "super-admin";

    // Standard users can ONLY perform private uploads. Admins can perform standard ingestion.
    const isPrivate = !isAdmin || !!body.userId;
    const userId = isPrivate ? (isAdmin ? (body.userId || ctx.uid) : ctx.uid) : null;
    const requesterEmail = ctx.email || "anonymous@fahem.app";

    // Harmonize fields
    const resolvedSubjectId = subject_id || "subj_user_uploads";
    const resolvedTitle = title || "Untitled Document";
    const resolvedTitleAr = title_ar || title || "مستند شخصي";
    const resolvedSourceUrl = source_url || downloadUrl || "";
    const resolvedStoragePath = storage_path || storagePath || "";
    const resolvedSizeBytes = Number(sizeBytes || 0);

    if (!isPrivate) {
      if (!resolvedSubjectId || !resolvedTitle || !resolvedTitleAr) {
        return new Response(JSON.stringify({ error: "Missing required fields: subject_id, title, title_ar" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    } else {
      if (resolvedSizeBytes > 20 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "File size exceeds the maximum limit of 20MB" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Determine if superadmin approval is required (only for standard admin actions)
    const needsApproval = !isPrivate && !isSuper;

    // Generate a unique bookId
    let bookId = body.id || body.book_id;
    if (!bookId) {
      bookId = "book_" + resolvedTitle.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
    }

    // Prepare initial logs
    const initialLogs = [
      `[INIT] Ingestion container spawned successfully.`,
      `[INIT] Awaiting direct binary pipeline allocation...`,
      `[DOWNLOAD] Queuing download from: ${resolvedSourceUrl}`
    ];

    const titleTranslations = await translateMetadata(resolvedTitle || resolvedTitleAr);

    const draftBook: any = {
      _id: bookId,
      subject_id: resolvedSubjectId,
      title: resolvedTitle,
      title_ar: resolvedTitleAr,
      title_en: titleTranslations.en || resolvedTitle,
      title_es: titleTranslations.es || resolvedTitle,
      title_fr: titleTranslations.fr || resolvedTitle,
      title_de: titleTranslations.de || resolvedTitle,
      title_zh: titleTranslations.zh || resolvedTitle,
      title_it: titleTranslations.it || resolvedTitle,
      grade: grade || "General",
      term: term || "Term 1",
      year: year || new Date().getFullYear().toString(),
      language: language || "ar",
      book_type: book_type || "core",
      source_url: resolvedSourceUrl,
      storage_path: resolvedStoragePath,
      chapters: chapters || [],
      is_downloaded: !needsApproval,
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
      sizeBytes: resolvedSizeBytes,
      size_bytes: resolvedSizeBytes,
      needs_approval: needsApproval,
      ingestion_status: needsApproval ? "pending_approval" : "queued",
      ingestion_progress: 5,
      ingestion_logs: initialLogs,
      processed_pages: 0,
      created_at: Date.now() / 1000,
      updated_at: Date.now() / 1000
    };
    const proxyPayload = {
      subject_id: resolvedSubjectId,
      title: resolvedTitle,
      title_ar: resolvedTitleAr,
      grade: grade || "General",
      term: term || "Term 1",
      year: year || new Date().getFullYear().toString(),
      language: language || "ar",
      book_type: book_type || "core",
      source_url: resolvedSourceUrl,
      storage_path: resolvedStoragePath,
      chapters: chapters || [],
      userId: userId || null,
      sizeBytes: resolvedSizeBytes,
      size_bytes: resolvedSizeBytes,
      forceReindex: !!forceReindex,
      needs_approval: needsApproval,
      requesterEmail: requesterEmail || null
    };

    if (!isLocalEnv()) {
      return await proxyRequest("/user/books", "POST", proxyPayload, ctx);
    }

    // 1. Local environment check
    if (isLocalEnv()) {
      const db = getLocalDb() as any;

      // Enforce file limit and storage limit for private uploads in local DB
      if (isPrivate) {
        const userBooks = (db.books || []).filter((b: any) => b.userId === userId);
        if (userBooks.length >= 10) {
          return new Response(JSON.stringify({ error: "Maximum limit of 10 files exceeded" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        const cumulativeSize = userBooks.reduce((sum: number, b: any) => sum + Number(b.sizeBytes || b.size_bytes || 0), 0) + resolvedSizeBytes;
        if (cumulativeSize > 100 * 1024 * 1024) {
          return new Response(JSON.stringify({ error: "Cumulative storage limit of 100MB exceeded" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
      }

      // Ensure subject exists locally & books and subjects are linked
      let subjectIdx = db.subjects.findIndex((subj: any) => subj._id === resolvedSubjectId);
      if (subjectIdx < 0) {
        const fallbackSubject = {
          _id: resolvedSubjectId,
          name: resolvedSubjectId.replace("subj_", "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
          name_ar: "مادة دراسية مرتبطة",
          grade_level: grade || "General",
          category: "General",
          emoji: "📚",
          books_count: 0
        };
        db.subjects.push(fallbackSubject);
        subjectIdx = db.subjects.length - 1;
        console.log(`[Ingestion Local] Subject '${resolvedSubjectId}' created and linked automatically.`);
      }

      // Check if exact copy exists on system
      let existingBookIdx = db.books.findIndex((b: any) => {
        if (resolvedSourceUrl && b.source_url === resolvedSourceUrl) return true;
        return (
          b.title.toLowerCase() === resolvedTitle.toLowerCase() &&
          b.subject_id === resolvedSubjectId &&
          b.userId === (userId || null)
        );
      });

      if (existingBookIdx >= 0 && !forceReindex) {
        const existingBook = db.books[existingBookIdx];
        console.log(`[Ingestion Local] Exact copy of book found: ${existingBook._id}. Skipping duplication.`);
        return new Response(JSON.stringify({ success: true, message: "Book already exists or currently ingesting.", book: existingBook }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Terminate running job if any
      const activeChild = global.activeBookJobs?.get(bookId);
      if (activeChild) {
        try {
          activeChild.kill();
          global.activeBookJobs?.delete(bookId);
        } catch (e) {}
      }

      if (existingBookIdx >= 0) {
        // Overwrite in place
        db.books[existingBookIdx] = draftBook;
      } else {
        db.books.push(draftBook);
        db.subjects[subjectIdx].books_count = (db.subjects[subjectIdx].books_count || 0) + 1;
      }
      
      saveLocalDb(db);

      if (needsApproval) {
        return new Response(JSON.stringify({
          success: true,
          needsApproval: true,
          message: "New book queued for Superadmin approval.",
          book: draftBook
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Spawn Python process
      try {
        const pythonPath = "python";
        const scriptPath = resolveScriptPath(path.join("ingestion_v2", "job_fetch.py"));

        const payload = {
          book_id: bookId,
          subject_id: resolvedSubjectId,
          title: resolvedTitle,
          title_ar: resolvedTitleAr,
          source_url: resolvedSourceUrl,
          storage_path: resolvedStoragePath,
          grade: grade || "General",
          term: term || "Term 1",
          year: year || "2026",
          language: language || "ar",
          book_type: book_type || "core",
          is_private: isPrivate,
          userId: userId || null,
          is_local: true
        };

        logToServerFile(`[LOCAL INGEST] Triggering local ingestion for book: "${resolvedTitle}" (ID: ${bookId})`);
        logToServerFile(`[LOCAL INGEST] Script path: "${scriptPath}"`);
        logToServerFile(`[LOCAL INGEST] Payload sent to python stdin: ${JSON.stringify(payload, null, 2)}`);

        const child = spawn(pythonPath, [scriptPath], { env: process.env });
        global.activeBookJobs?.set(bookId, child);

        logToServerFile(`[LOCAL INGEST] Child process spawned successfully with PID: ${child.pid}`);

        child.stdin.write(JSON.stringify(payload));
        child.stdin.end();

        child.stdout.on("data", (data) => {
          const outStr = data.toString().trim();
          console.log(`[Ingestion Local stdout] ${outStr}`);
          logToServerFile(`[LOCAL PROCESS stdout] [PID ${child.pid}] ${outStr}`);
        });
        child.stderr.on("data", (data) => {
          const errStr = data.toString().trim();
          console.error(`[Ingestion Local stderr] ${errStr}`);
          logToServerFile(`[LOCAL PROCESS stderr] [PID ${child.pid}] ⚠️ ${errStr}`);
        });
        child.on("close", (code) => {
          global.activeBookJobs?.delete(bookId);
          console.log(`[Ingestion Local Child Process] Book ${bookId} exited with code ${code}`);
          logToServerFile(`[LOCAL INGEST] Child process (PID ${child.pid}) exited cleanly with code: ${code}`);
        });

      } catch (e: any) {
        console.error("[Ingestion Local Child Process Spawn Error]", e);
        logToServerFile(`[LOCAL INGEST CRITICAL ERROR] Failed to spawn process: ${e.message}\n${e.stack}`);
      }

      return new Response(JSON.stringify({ success: true, message: "New book upload queued and background ingestion started.", book: draftBook }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

  } catch (err: any) {
    console.error("[api-books-post] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await verifyAuth(req);
    if (!ctx) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const isAdmin = ctx.role === "admin" || ctx.role === "super-admin";
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Access Denied: Requester is not authorized." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const {
      id,
      subject_id,
      title,
      title_ar,
      grade,
      term,
      year,
      language,
      book_type,
      source_url,
      storage_path,
      chapters
    } = body;

    const requesterEmail = ctx.email || "anonymous@fahem.app";

    if (!id || !subject_id || !title || !title_ar) {
      return new Response(JSON.stringify({ error: "Missing required fields: id, subject_id, title, title_ar" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const titleTranslations = await translateMetadata(title || title_ar);

    if (!isLocalEnv()) {
      return await proxyRequest("/user/books", "PUT", {
        id,
        subject_id,
        title,
        title_ar,
        title_en: titleTranslations.en || title,
        title_es: titleTranslations.es || title,
        title_fr: titleTranslations.fr || title,
        title_de: titleTranslations.de || title,
        title_zh: titleTranslations.zh || title,
        title_it: titleTranslations.it || title,
        grade,
        term,
        year,
        language,
        book_type,
        source_url,
        storage_path,
        chapters
      }, ctx);
    }

    const db = getLocalDb() as any;
    const idx = db.books.findIndex((b: any) => b._id === id);
    if (idx < 0) {
      return new Response(JSON.stringify({ error: "Book not found locally" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Determine total pages
    let total_pages = db.books[idx].total_pages || 120;
    if (chapters && Array.isArray(chapters)) {
      try {
        const maxPage = Math.max(...chapters.map((ch: any) => parseInt(ch.end_page || 0)));
        if (maxPage > 0) total_pages = maxPage;
      } catch (e) {}
    }

    db.books[idx] = {
      ...db.books[idx],
      subject_id,
      title,
      title_ar,
      title_en: titleTranslations.en || title,
      title_es: titleTranslations.es || title,
      title_fr: titleTranslations.fr || title,
      title_de: titleTranslations.de || title,
      title_zh: titleTranslations.zh || title,
      title_it: titleTranslations.it || title,
      grade: grade || "General",
      term: term || "Term 1",
      year: year || "2026",
      language: language || "ar",
      book_type: book_type || "core",
      source_url: source_url || "",
      storage_path: storage_path || "",
      chapters: chapters || [],
      total_pages,
      updated_at: Date.now() / 1000
    };

    saveLocalDb(db);
    return new Response(JSON.stringify({ success: true, book: db.books[idx] }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[api-books-put] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await verifyAuth(req);
    if (!ctx) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const isAdmin = ctx.role === "admin" || ctx.role === "super-admin";

    if (isLocalEnv()) {
      const db = getLocalDb() as any;
      const idx = db.books.findIndex((b: any) => b._id === id);
      if (idx < 0) {
        return new Response(JSON.stringify({ error: "Book not found locally" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      const book = db.books[idx];
      // IDOR Protection: Standard users cannot delete other users' private books
      if (book.userId && book.userId !== ctx.uid && !isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden: You do not own this book" }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
      // Public books can only be deleted by admin
      if (!book.userId && !isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden: Admin access required to delete public books" }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }

      // If the book ingestion job is currently running, terminate it first!
      const activeChild = global.activeBookJobs?.get(id);
      if (activeChild) {
        try {
          activeChild.kill();
          global.activeBookJobs?.delete(id);
          console.log(`[Ingestion Local] Terminated active process of book ${id} during deletion.`);
        } catch (e) {}
      }

      const subjectId = db.books[idx].subject_id;
      db.books.splice(idx, 1);

      // Decrement books_count on subject
      const subjectIdx = db.subjects.findIndex((s: any) => s._id === subjectId);
      if (subjectIdx >= 0) {
        db.subjects[subjectIdx].books_count = Math.max(0, (db.subjects[subjectIdx].books_count || 1) - 1);
      }

      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, message: "Book deleted locally." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Proxy to Cloud Run Agent
    return await proxyRequest(`/user/books?id=${id}`, "DELETE", undefined, ctx);

  } catch (err: any) {
    console.error("[api-books-delete] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
