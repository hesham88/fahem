import { NextRequest } from "next/server";
import { checkIsAdmin } from "../admin/helper";
import { proxyRequest } from "../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../localDbHelper";

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
      requesterEmail
    } = await req.json();

    if (!requesterEmail || !subject_id || !title || !title_ar) {
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

    // 1. Local environment check
    if (isLocalEnv()) {
      const db = getLocalDb();
      const bookId = "book_" + title.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();

      const newBook = {
        _id: bookId,
        subject_id,
        title,
        title_ar,
        grade: grade || "General",
        term: term || "Term 1",
        year: year || new Date().getFullYear().toString(),
        language: language || "ar",
        book_type: book_type || "core",
        source_url: source_url || "",
        storage_path: storage_path || "",
        chapters: chapters || []
      };

      db.books.push(newBook);

      // Increment books_count in the corresponding subject
      const subjectIdx = db.subjects.findIndex(subj => subj._id === subject_id);
      if (subjectIdx >= 0) {
        db.subjects[subjectIdx].books_count = (db.subjects[subjectIdx].books_count || 0) + 1;
      }

      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, book: newBook }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Production: Proxy to Cloud Run Agent
    return await proxyRequest("/user/books", "POST", {
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
    console.error("[api-books-post] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

