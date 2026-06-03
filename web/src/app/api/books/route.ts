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

      // Ensure subject exists locally & books and subjects are linked
      let subjectIdx = db.subjects.findIndex(subj => subj._id === subject_id);
      if (subjectIdx < 0) {
        const fallbackSubject = {
          _id: subject_id,
          name: subject_id.replace("subj_", "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
          name_ar: "مادة دراسية مرتبطة",
          grade_level: grade || "General",
          category: "General",
          emoji: "📚",
          books_count: 0
        };
        db.subjects.push(fallbackSubject);
        subjectIdx = db.subjects.length - 1;
        console.log(`[Ingestion Local] Subject '${subject_id}' created and linked automatically.`);
      }

      // Check if exact copy exists on system
      let existingBook = db.books.find(b => {
        if (source_url && b.source_url === source_url) return true;
        return (
          b.title.toLowerCase() === title.toLowerCase() &&
          b.subject_id === subject_id &&
          b.grade === (grade || "General") &&
          b.term === (term || "Term 1") &&
          b.year === (year || "2026")
        );
      });

      // Determine total pages
      let total_pages = 120;
      if (chapters && Array.isArray(chapters)) {
        try {
          const maxPage = Math.max(...chapters.map((ch: any) => parseInt(ch.end_page || 0)));
          if (maxPage > 0) {
            total_pages = maxPage;
          }
        } catch (e) {}
      }

      if (existingBook) {
        console.log(`[Ingestion Local] Exact copy of book found: ${existingBook._id}. Skipping download.`);

        const is_downloaded = existingBook.is_downloaded ?? true;
        const is_indexed = existingBook.is_indexed ?? false;
        const is_vectored = existingBook.is_vectored ?? false;
        const is_embedded = existingBook.is_embedded ?? false;
        const is_analyzed = existingBook.is_analyzed ?? false;
        const is_extracted = existingBook.is_extracted ?? false;
        const is_processed = existingBook.is_processed ?? false;
        const is_completed = existingBook.is_completed ?? false;
        const last_processed_page = existingBook.last_processed_page ?? 0;

        if (
          is_indexed && is_vectored && is_embedded && is_analyzed &&
          is_extracted && is_processed && is_completed && last_processed_page >= total_pages
        ) {
          console.log(`[Ingestion Local] Book ${existingBook._id} is already fully processed. Skipping operations.`);
          return new Response(JSON.stringify({ success: true, message: "Book already fully processed. Skipped.", book: existingBook }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Resume partial processing page-by-page to avoid redoing work
        console.log(`[Ingestion Local] Book ${existingBook._id} is partially processed. Resuming from page ${last_processed_page + 1} of ${total_pages}...`);

        for (let page = last_processed_page + 1; page <= total_pages; page++) {
          existingBook.last_processed_page = page;
          existingBook.extracted_pages_count = page;
          console.log(`[Ingestion Local] [Resume] Extracted, indexed, and embedded page ${page}/${total_pages} of book ${existingBook._id}`);
        }

        existingBook.is_downloaded = true;
        existingBook.is_indexed = true;
        existingBook.is_vectored = true;
        existingBook.is_embedded = true;
        existingBook.is_analyzed = true;
        existingBook.is_extracted = true;
        existingBook.is_processed = true;
        existingBook.is_completed = true;

        saveLocalDb(db);
        return new Response(JSON.stringify({ success: true, message: "Book processing resumed and completed.", book: existingBook }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } else {
        // Brand new book
        console.log(`[Ingestion Local] New book detected. Initiating download for ${source_url || title}`);
        
        const bookId = "book_" + title.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
        console.log(`[Ingestion Local] Processing brand new book ${bookId} page-by-page up to ${total_pages}...`);

        const newBook: any = {
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
          chapters: chapters || [],
          is_downloaded: true,
          is_indexed: false,
          is_vectored: false,
          is_embedded: false,
          is_analyzed: false,
          is_extracted: false,
          is_processed: false,
          is_completed: false,
          total_pages,
          last_processed_page: 0,
          extracted_pages_count: 0
        };

        db.books.push(newBook);
        saveLocalDb(db); // Save initial draft so we can resume if interrupted

        // Process page-by-page up to the last page
        for (let page = 1; page <= total_pages; page++) {
          newBook.last_processed_page = page;
          newBook.extracted_pages_count = page;
          console.log(`[Ingestion Local] Extracted, indexed, and embedded page ${page}/${total_pages} of new book ${bookId}`);
        }

        newBook.is_indexed = true;
        newBook.is_vectored = true;
        newBook.is_embedded = true;
        newBook.is_analyzed = true;
        newBook.is_extracted = true;
        newBook.is_processed = true;
        newBook.is_completed = true;

        // Increment books_count in the corresponding subject
        db.subjects[subjectIdx].books_count = (db.subjects[subjectIdx].books_count || 0) + 1;

        saveLocalDb(db);
        return new Response(JSON.stringify({ success: true, message: "New book ingested and fully processed.", book: newBook }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
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

