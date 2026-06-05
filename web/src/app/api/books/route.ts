import { NextRequest } from "next/server";
import { checkIsAdmin, checkIsSuperadmin } from "../admin/helper";
import { proxyRequest } from "../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb, resolveScriptPath, shouldSkipDirectMongo } from "../localDbHelper";
import { spawn } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

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
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const bookId = searchParams.get("bookId");

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
        return new Response(JSON.stringify({ success: true, book }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      let filteredBooks = db.books || [];
      if (subjectId) {
        filteredBooks = filteredBooks.filter((b: any) => b.subject_id === subjectId);
      }
      return new Response(JSON.stringify({ success: true, books: filteredBooks }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Production: Check MongoDB or proxy to Cloud Run Agent
    try {
      if (shouldSkipDirectMongo()) {
        throw new Error("Direct database connections skipped on App Hosting Serverless");
      }
      const { MongoClient } = require("mongodb");
      const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
      await client.connect();
      const db = client.db("fahem");

      if (bookId) {
        const book = await db.collection("books").findOne({ _id: bookId });
        await client.close();
        if (!book) {
          return new Response(JSON.stringify({ error: "Book not found in database" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ success: true, book }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      await client.close();
    } catch (mongoErr) {
      // Fallback if mongo is unreachable
    }

    const params = new URLSearchParams();
    if (subjectId) params.append("subject_id", subjectId);
    if (bookId) params.append("book_id", bookId);

    return await proxyRequest(`/user/books?${params.toString()}`, "GET");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
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
      requesterEmail,
      userId,
      storagePath,
      downloadUrl,
      sizeBytes,
      format,
      forceReindex = false
    } = body;

    // Harmonize fields
    const isPrivate = !!userId;
    const resolvedSubjectId = subject_id || "subj_user_uploads";
    const resolvedTitle = title || "Untitled Document";
    const resolvedTitleAr = title_ar || title || "مستند شخصي";
    const resolvedSourceUrl = source_url || downloadUrl || "";
    const resolvedStoragePath = storage_path || storagePath || "";
    const resolvedSizeBytes = Number(sizeBytes || 0);

    // Bypass checkIsAdmin audit if it is a private student upload
    if (!isPrivate) {
      if (!requesterEmail || !resolvedSubjectId || !resolvedTitle || !resolvedTitleAr) {
        return new Response(JSON.stringify({ error: "Missing required fields: requesterEmail, subject_id, title, title_ar" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Verify requester is admin/superadmin
      const isAdmin = await checkIsAdmin(requesterEmail);
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Access Denied: Requester is not an authorized administrator." }), {
          status: 403,
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
    const isSuper = await checkIsSuperadmin(requesterEmail || "");
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

    if (!isLocalEnv()) {
      return await proxyRequest("/user/books", "POST", body);
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
        const scriptPath = resolveScriptPath(path.join("ingestion", "job_fetch.py"));

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

        const child = spawn(pythonPath, [scriptPath]);
        global.activeBookJobs?.set(bookId, child);

        child.stdin.write(JSON.stringify(payload));
        child.stdin.end();

        child.stdout.on("data", (data) => {
          console.log(`[Ingestion Local stdout] ${data}`);
        });
        child.stderr.on("data", (data) => {
          console.error(`[Ingestion Local stderr] ${data}`);
        });
        child.on("close", (code) => {
          global.activeBookJobs?.delete(bookId);
          console.log(`[Ingestion Local Child Process] Book ${bookId} exited with code ${code}`);
        });

      } catch (e: any) {
        console.error("[Ingestion Local Child Process Spawn Error]", e);
      }

      return new Response(JSON.stringify({ success: true, message: "New book upload queued and background ingestion started.", book: draftBook }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Production: Update MongoDB
    try {
      const { MongoClient } = require("mongodb");
      const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
      await client.connect();
      const db = client.db("fahem");

      await db.collection("books").updateOne(
        { _id: bookId },
        { $set: draftBook },
        { upsert: true }
      );
      await client.close();
    } catch (mongoErr) {
      // Ignore Mongo error
    }

    // Also trigger python process in production container
    try {
      const pythonPath = "python";
      const scriptPath = resolveScriptPath(path.join("ingestion", "job_fetch.py"));

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
        is_local: false
      };

      const child = spawn(pythonPath, [scriptPath]);
      global.activeBookJobs?.set(bookId, child);

      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();

      child.on("close", () => {
        global.activeBookJobs?.delete(bookId);
      });
    } catch (e) {
      // Ignore process launch errors in non-local environment if handled by real Cloud Run endpoint
    }

    // Return proxy result or fallback success
    return new Response(JSON.stringify({ success: true, message: "Book ingestion job dispatched to production container.", book: draftBook }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

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
      chapters,
      requesterEmail
    } = await req.json();

    if (!requesterEmail || !id || !subject_id || !title || !title_ar) {
      return new Response(JSON.stringify({ error: "Missing required fields: requesterEmail, id, subject_id, title, title_ar" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const isAdmin = await checkIsAdmin(requesterEmail);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Access Denied: Requester is not authorized." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const titleTranslations = await translateMetadata(title || title_ar);

    if (isLocalEnv()) {
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
    }

    // Production: Update MongoDB directly
    try {
      if (shouldSkipDirectMongo()) {
        throw new Error("Direct database connections skipped on App Hosting Serverless");
      }
      const { MongoClient } = require("mongodb");
      const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
      await client.connect();
      const db = client.db("fahem");
      await db.collection("books").updateOne(
        { _id: id },
        {
          $set: {
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
            updated_at: Date.now() / 1000
          }
        }
      );
      await client.close();
    } catch (mongoErr) {
      console.error("[PUT Book Mongo Error]:", mongoErr);
    }

    // Proxy to Cloud Run Agent
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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const requesterEmail = searchParams.get("requesterEmail");

    if (!id || !requesterEmail) {
      return new Response(JSON.stringify({ error: "Missing id or requesterEmail parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const isAdmin = await checkIsAdmin(requesterEmail);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Access Denied: Requester is not authorized." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb() as any;
      const idx = db.books.findIndex((b: any) => b._id === id);
      if (idx < 0) {
        return new Response(JSON.stringify({ error: "Book not found locally" }), {
          status: 404,
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
    return await proxyRequest(`/user/books?id=${id}`, "DELETE");

  } catch (err: any) {
    console.error("[api-books-delete] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
