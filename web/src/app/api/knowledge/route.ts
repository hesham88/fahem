import { NextRequest } from "next/server";
import { requireUser } from "../_auth";
import { proxyRequest } from "../proxy";
import { isLocalEnv, getLocalDb } from "../localDbHelper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authCtx = await requireUser(req);
    if (authCtx instanceof Response) return authCtx;

    const { searchParams } = new URL(req.url);
    const libraryId = searchParams.get("library_id");
    const curriculumId = searchParams.get("curriculum_id");
    const subjectId = searchParams.get("subject_id");
    const role = searchParams.get("role");
    const language = searchParams.get("language");
    const textQuery = searchParams.get("query") || searchParams.get("search");

    // Extract dynamic scope filters (any parameter not in the standard list)
    const standardKeys = ["library_id", "curriculum_id", "subject_id", "role", "language", "query", "search", "locale"];
    const scopeFilters: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      if (!standardKeys.includes(key)) {
        scopeFilters[key] = val;
      }
    });

    if (isLocalEnv()) {
      const db = getLocalDb();
      // Project out heavy fields like ingestion_logs, pages, chunks, content to reduce latency and payload size
      let books = (db.books || []).map((b: any) => {
        const { ingestion_logs, pages, chunks, content, extracted_text, ...rest } = b;
        return rest;
      });
      let curricula = db.curricula || [];
      let subjects = db.subjects || [];

      // 1. Filter curricula by library_id
      if (libraryId) {
        const lib = (db.libraries || []) .find((l: any) => l._id === libraryId);
        curricula = curricula.filter((c: any) => {
          if (c.library_id === libraryId) return true;
          if (lib && lib.subject_id && c.subject_id === lib.subject_id) return true;
          return false;
        });
      }

      // 2. Filter curricula by dynamic scope filters
      if (Object.keys(scopeFilters).length > 0) {
        curricula = curricula.filter((c: any) => {
          if (!c.scope || typeof c.scope !== "object") return false;
          return Object.entries(scopeFilters).every(([key, val]) => {
            return c.scope[key] === val;
          });
        });
      }

      // Get valid curriculum IDs from filtered curricula
      const validCurriculumIds = new Set(curricula.map((c: any) => c._id));

      // 3. Filter books
      books = books.filter((book: any) => {
        // Visibility check
        const isOwner = book.owner_uid === authCtx.uid;
        const isPublic = book.visibility === "public" || !book.visibility;
        if (!isPublic && !isOwner) return false;

        // Library check
        if (libraryId) {
          const lib = (db.libraries || []).find((l: any) => l._id === libraryId);
          const isDirectMatch = book.library_id === libraryId;
          const isSubjectMatch = lib && lib.subject_id && book.subject_id === lib.subject_id;
          const isOpenstaxFallback = libraryId === "lib_openstax" && ((book.titleEn && book.titleEn.toLowerCase().includes("openstax")) || (book.title && book.title.toLowerCase().includes("openstax")) || book.library_id === "lib_openstax");
          
          if (!isDirectMatch && !isSubjectMatch && !isOpenstaxFallback) {
            return false;
          }
        }

        // Curriculum check (either direct curriculumId filter or via scoped curricula list)
        if (curriculumId) {
          if (book.curriculum_id !== curriculumId) return false;
        } else if (libraryId || Object.keys(scopeFilters).length > 0) {
          if (!book.curriculum_id || !validCurriculumIds.has(book.curriculum_id)) return false;
        }

        // Subject check
        if (subjectId && book.subject_id !== subjectId) return false;

        // Role check
        if (role && book.role !== role) return false;

        // Language check
        if (language && book.language !== language) return false;

        // Text query
        if (textQuery) {
          const q = textQuery.toLowerCase();
          const titleEn = (book.title || "").toLowerCase();
          const titleAr = (book.title_ar || "").toLowerCase();
          const descEn = (book.description || "").toLowerCase();
          const descAr = (book.description_ar || "").toLowerCase();
          if (!titleEn.includes(q) && !titleAr.includes(q) && !descEn.includes(q) && !descAr.includes(q)) {
            return false;
          }
        }

        return true;
      });

      // 4. Get active subjects based on filtered books
      const activeSubjectIds = new Set(books.map((b: any) => b.subject_id).filter(Boolean));
      let filteredSubjects = subjects.filter((s: any) => {
        if (subjectId) return s._id === subjectId;
        // If curriculum_id is provided, filter subjects of that curriculum or subjects carrying books in the filtered set
        if (curriculumId) {
          return s.curriculum_id === curriculumId;
        }
        return activeSubjectIds.has(s._id);
      });

      // 5. Group books by subject
      const subjectsWithBooks = filteredSubjects.map((subject: any) => {
        const subjectBooks = books.filter((b: any) => b.subject_id === subject._id);
        
        // Split into core and supporting
        const coreBooks = subjectBooks.filter((b: any) => b.role === "core" || !b.role);
        const supportingBooks = subjectBooks.filter((b: any) => b.role === "supporting");

        return {
          ...subject,
          books: subjectBooks,
          core_books: coreBooks,
          supporting_books: supportingBooks,
          books_count: subjectBooks.length
        };
      }).filter((s: any) => s.books_count > 0 || curriculumId); // Keep empty subjects only if specifically viewing a single curriculum

      return new Response(JSON.stringify({
        success: true,
        subjects: subjectsWithBooks,
        total_books: books.length
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Proxy to production Python backend if not local
    let proxyPath = `/user/knowledge?${searchParams.toString()}`;
    return await proxyRequest(proxyPath, "GET", null, authCtx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
