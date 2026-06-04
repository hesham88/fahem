import { NextRequest } from "next/server";
import { checkIsAdmin, checkIsSuperadmin } from "../admin/helper";
import { proxyRequest } from "../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../localDbHelper";
import { spawn } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");

    // 1. Local environment check
    if (isLocalEnv()) {
      const db = getLocalDb();
      let filteredBooks = db.books;
      if (subjectId) {
        filteredBooks = db.books.filter(b => b.subject_id === subjectId);
      }
      return new Response(JSON.stringify({ success: true, books: filteredBooks }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Production: Proxy to Cloud Run Agent
    const params = new URLSearchParams();
    if (subjectId) params.append("subject_id", subjectId);

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
      format
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
      // Validate private student upload limitations
      // 1. Single file size <= 20MB (20 * 1024 * 1024 bytes)
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

    // 1. Local environment check
    if (isLocalEnv()) {
      const db = getLocalDb();

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
      let existingBook = db.books.find((b: any) => {
        if (resolvedSourceUrl && b.source_url === resolvedSourceUrl) return true;
        return (
          b.title.toLowerCase() === resolvedTitle.toLowerCase() &&
          b.subject_id === resolvedSubjectId &&
          b.userId === (userId || null)
        );
      });

      if (existingBook) {
        console.log(`[Ingestion Local] Exact copy of book found: ${existingBook._id}. Skipping duplication.`);
        return new Response(JSON.stringify({ success: true, message: "Book already exists or currently ingesting.", book: existingBook }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Brand new book - create draft
      const bookId = "book_" + resolvedTitle.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
      
      if (needsApproval) {
        console.log(`[Ingestion Local] Book ${bookId} requires Superadmin approval. Saving as pending.`);
      } else {
        console.log(`[Ingestion Local] Starting real ingestion for brand new book ${bookId} in background...`);
      }

      const draftBook: any = {
        _id: bookId,
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
        needs_approval: needsApproval
      };

      db.books.push(draftBook);
      db.subjects[subjectIdx].books_count = (db.subjects[subjectIdx].books_count || 0) + 1;
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

      // Trigger real asynchronous background execution of scripts/ingest_book.py passing JSON through stdin
      try {
        const pythonPath = "python";
        const scriptPath = "C:\\Users\\hesh1\\Desktop\\fahem\\scripts\\ingest_book.py";
        
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
        child.stdin.write(JSON.stringify(payload));
        child.stdin.end();

        child.stdout.on("data", (data) => {
          console.log(`[Ingestion Local stdout] ${data}`);
        });
        child.stderr.on("data", (data) => {
          console.error(`[Ingestion Local stderr] ${data}`);
        });
        child.on("close", (code) => {
          console.log(`[Ingestion Local Child Process] exited with code ${code}`);
        });

      } catch (e: any) {
        console.error("[Ingestion Local Child Process Spawn Error]", e);
      }

      return new Response(JSON.stringify({ success: true, message: "New book upload queued and background ingestion started.", book: draftBook }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Production: Proxy to Cloud Run Agent
    return await proxyRequest("/user/books", "POST", {
      subject_id: resolvedSubjectId,
      title: resolvedTitle,
      title_ar: resolvedTitleAr,
      grade: grade || "General",
      term: term || "Term 1",
      year: year || "2026",
      language: language || "ar",
      book_type: book_type || "core",
      source_url: resolvedSourceUrl,
      storage_path: resolvedStoragePath,
      chapters: chapters || [],
      userId: userId || null,
      sizeBytes: resolvedSizeBytes
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

    if (isLocalEnv()) {
      const db = getLocalDb();
      const idx = db.books.findIndex(b => b._id === id);
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
        grade: grade || "General",
        term: term || "Term 1",
        year: year || "2026",
        language: language || "ar",
        book_type: book_type || "core",
        source_url: source_url || "",
        storage_path: storage_path || "",
        chapters: chapters || [],
        total_pages
      };

      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, book: db.books[idx] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Proxy to Cloud Run Agent
    return await proxyRequest("/user/books", "PUT", {
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
      const db = getLocalDb();
      const idx = db.books.findIndex(b => b._id === id);
      if (idx < 0) {
        return new Response(JSON.stringify({ error: "Book not found locally" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      const subjectId = db.books[idx].subject_id;
      db.books.splice(idx, 1);

      // Decrement books_count on subject
      const subjectIdx = db.subjects.findIndex(s => s._id === subjectId);
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
