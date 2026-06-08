import { NextRequest } from "next/server";
import { requireAdmin } from "../../../_auth";
import { proxyRequest } from "../../../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../../../localDbHelper";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const authCtx = await requireAdmin(req);
    if (authCtx instanceof Response) return authCtx;

    const { id: bookId } = params;
    const payload = await req.json();
    const { curriculum_id, subject_id, role, action } = payload;

    if (action === "decouple") {
      if (isLocalEnv()) {
        const db = getLocalDb();
        db.books = db.books || [];
        db.subjects = db.subjects || [];

        const bookIdx = db.books.findIndex((b: any) => b._id === bookId);
        if (bookIdx < 0) {
          return new Response(JSON.stringify({ error: `Book with ID '${bookId}' not found` }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }

        const oldSubjectId = db.books[bookIdx].subject_id;
        db.books[bookIdx] = {
          ...db.books[bookIdx],
          curriculum_id: null,
          library_id: null,
          subject_id: null,
          role: null,
          updated_at: new Date().toISOString()
        };

        if (oldSubjectId) {
          const oldSubjIdx = db.subjects.findIndex((s: any) => s._id === oldSubjectId);
          if (oldSubjIdx >= 0) {
            const oldSubj = db.subjects[oldSubjIdx];
            oldSubj.core_book_ids = (oldSubj.core_book_ids || []).filter((bid: string) => bid !== bookId);
            oldSubj.supporting_book_ids = (oldSubj.supporting_book_ids || []).filter((bid: string) => bid !== bookId);
            oldSubj.books_count = (oldSubj.core_book_ids.length + oldSubj.supporting_book_ids.length);
            db.subjects[oldSubjIdx] = oldSubj;
          }
        }

        saveLocalDb(db);
        return new Response(JSON.stringify({ success: true, book: db.books[bookIdx] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return await proxyRequest(`/user/books/${bookId}/assign`, "PATCH", payload, authCtx);
    }

    if (!curriculum_id || !subject_id || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields: curriculum_id, subject_id, role" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (role !== "core" && role !== "supporting") {
      return new Response(JSON.stringify({ error: "Invalid role value. Must be 'core' or 'supporting'" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      db.books = db.books || [];
      db.curricula = db.curricula || [];
      db.subjects = db.subjects || [];

      // Find the book
      const bookIdx = db.books.findIndex((b: any) => b._id === bookId);
      if (bookIdx < 0) {
        return new Response(JSON.stringify({ error: `Book with ID '${bookId}' not found` }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Find the curriculum
      const curriculum = db.curricula.find((c: any) => c._id === curriculum_id);
      if (!curriculum) {
        return new Response(JSON.stringify({ error: `Curriculum with ID '${curriculum_id}' not found` }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Find the subject
      const subject = db.subjects.find((s: any) => s._id === subject_id);
      if (!subject) {
        return new Response(JSON.stringify({ error: `Subject with ID '${subject_id}' not found` }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Update book fields
      const oldSubjectId = db.books[bookIdx].subject_id;
      const oldRole = db.books[bookIdx].role;

      db.books[bookIdx] = {
        ...db.books[bookIdx],
        curriculum_id,
        library_id: curriculum.library_id,
        subject_id,
        role,
        updated_at: new Date().toISOString()
      };

      // Clean up old subject relations if any
      if (oldSubjectId) {
        const oldSubjIdx = db.subjects.findIndex((s: any) => s._id === oldSubjectId);
        if (oldSubjIdx >= 0) {
          const oldSubj = db.subjects[oldSubjIdx];
          oldSubj.core_book_ids = (oldSubj.core_book_ids || []).filter((bid: string) => bid !== bookId);
          oldSubj.supporting_book_ids = (oldSubj.supporting_book_ids || []).filter((bid: string) => bid !== bookId);
          oldSubj.books_count = (oldSubj.core_book_ids.length + oldSubj.supporting_book_ids.length);
          db.subjects[oldSubjIdx] = oldSubj;
        }
      }

      // Add to new subject relations
      const subjIdx = db.subjects.findIndex((s: any) => s._id === subject_id);
      if (subjIdx >= 0) {
        const targetSubj = db.subjects[subjIdx];
        targetSubj.core_book_ids = targetSubj.core_book_ids || [];
        targetSubj.supporting_book_ids = targetSubj.supporting_book_ids || [];

        // Ensure unique
        if (role === "core") {
          targetSubj.supporting_book_ids = targetSubj.supporting_book_ids.filter((bid: string) => bid !== bookId);
          if (!targetSubj.core_book_ids.includes(bookId)) {
            targetSubj.core_book_ids.push(bookId);
          }
        } else {
          targetSubj.core_book_ids = targetSubj.core_book_ids.filter((bid: string) => bid !== bookId);
          if (!targetSubj.supporting_book_ids.includes(bookId)) {
            targetSubj.supporting_book_ids.push(bookId);
          }
        }

        targetSubj.books_count = (targetSubj.core_book_ids.length + targetSubj.supporting_book_ids.length);
        db.subjects[subjIdx] = targetSubj;
      }

      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, book: db.books[bookIdx] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest(`/user/books/${bookId}/assign`, "PATCH", payload, authCtx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
