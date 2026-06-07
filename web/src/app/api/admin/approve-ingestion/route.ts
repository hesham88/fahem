import { NextRequest } from "next/server";
import { requireSuperadmin } from "../../_auth";
import { isLocalEnv, getLocalDb, saveLocalDb, resolveScriptPath } from "../../localDbHelper";
import { proxyRequest } from "../../proxy";
import { spawn } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSuperadmin(req);
    if (ctx instanceof Response) return ctx;

    if (isLocalEnv()) {
      const db = getLocalDb();
      const pendingBooks = db.books.filter(b => b.needs_approval === true);
      return new Response(JSON.stringify({ success: true, books: pendingBooks }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Proxy to Cloud Run Agent
    return await proxyRequest("/admin/approve-ingestion", "GET", undefined, ctx);

  } catch (err: any) {
    console.error("[approve-ingestion GET] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSuperadmin(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const { bookId, action } = body;

    if (!bookId || !action) {
      return new Response(JSON.stringify({ error: "Missing required parameters: bookId, action" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      const idx = db.books.findIndex(b => b._id === bookId);

      if (idx < 0) {
        return new Response(JSON.stringify({ error: "Book not found locally" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      const book = db.books[idx];

      if (action === "approve") {
        db.books[idx].needs_approval = false;
        db.books[idx].is_downloaded = true;
        saveLocalDb(db);

        // Trigger real asynchronous background execution of ingestion v2 passing JSON through stdin
        try {
          const pythonPath = "python";
          const scriptPath = resolveScriptPath(path.join("ingestion_v2", "job_fetch.py"));
          
          const payload = {
            book_id: book._id,
            subject_id: book.subject_id,
            title: book.title,
            title_ar: book.title_ar,
            source_url: book.source_url || "",
            storage_path: book.storage_path || "",
            grade: book.grade || "General",
            term: book.term || "Term 1",
            year: book.year || "2026",
            language: book.language || "ar",
            book_type: book.book_type || "core",
            is_private: false,
            userId: null,
            is_local: true
          };

          const child = spawn(pythonPath, [scriptPath], { env: process.env });
          child.stdin.write(JSON.stringify(payload));
          child.stdin.end();

          child.stdout.on("data", (data) => {
            console.log(`[Ingestion Approved Local stdout] ${data}`);
          });
          child.stderr.on("data", (data) => {
            console.error(`[Ingestion Approved Local stderr] ${data}`);
          });
          child.on("close", (code) => {
            console.log(`[Ingestion Approved Local Child Process] exited with code ${code}`);
          });

        } catch (e: any) {
          console.error("[Ingestion Approved Local Child Process Spawn Error]", e);
        }

        return new Response(JSON.stringify({ success: true, message: "Book ingestion approved and background processing started.", book: db.books[idx] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });

      } else if (action === "reject") {
        const subjectId = book.subject_id;
        db.books.splice(idx, 1);

        // Decrement books_count on subject
        const subjectIdx = db.subjects.findIndex(s => s._id === subjectId);
        if (subjectIdx >= 0) {
          db.subjects[subjectIdx].books_count = Math.max(0, (db.subjects[subjectIdx].books_count || 1) - 1);
        }

        saveLocalDb(db);
        return new Response(JSON.stringify({ success: true, message: "Book ingestion rejected and removed from system." }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } else {
        return new Response(JSON.stringify({ error: "Invalid action. Must be 'approve' or 'reject'." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Proxy to Cloud Run Agent
    return await proxyRequest("/admin/approve-ingestion", "POST", { bookId, action }, ctx);

  } catch (err: any) {
    console.error("[approve-ingestion POST] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
