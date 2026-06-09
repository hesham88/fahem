import { NextRequest } from "next/server";
import { requireUser, requireAdmin } from "../_auth";
import { proxyRequest } from "../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../localDbHelper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authCtx = await requireUser(req);
    if (authCtx instanceof Response) return authCtx;

    if (isLocalEnv()) {
      const db = getLocalDb();
      const libraries = db.libraries || [];
      return new Response(JSON.stringify({ success: true, libraries }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/user/libraries", "GET", null, authCtx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    if (authCtx instanceof Response) return authCtx;

    const payload = await req.json();
    const { _id, name, name_ar, source, logo, scopeSchema, status } = payload;

    if (!_id || !name || !name_ar || !source || !scopeSchema) {
      return new Response(JSON.stringify({ error: "Missing required fields: _id, name, name_ar, source, scopeSchema" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      db.libraries = db.libraries || [];
      
      const idx = db.libraries.findIndex(l => l._id === _id);
      const library = {
        _id,
        name,
        name_ar,
        source,
        logo: logo || `/libs/${source}.svg`,
        scopeSchema,
        status: status || "active"
      };

      if (idx >= 0) {
        db.libraries[idx] = library;
      } else {
        db.libraries.push(library);
      }

      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, library }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/user/libraries", "POST", payload, authCtx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    if (authCtx instanceof Response) return authCtx;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      db.libraries = db.libraries || [];
      db.curricula = db.curricula || [];
      db.subjects = db.subjects || [];
      db.books = db.books || [];

      const idx = db.libraries.findIndex((l: any) => l._id === id);
      if (idx < 0) {
        return new Response(JSON.stringify({ error: `Library with ID '${id}' not found` }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Decouple books associated with this library
      db.books = db.books.map((b: any) => {
        if (b.library_id === id) {
          return { ...b, library_id: null, subject_id: null, curriculum_id: null, role: null };
        }
        return b;
      });

      // Find curricula under this library
      const curriculaUnderLibrary = db.curricula.filter((c: any) => c.library_id === id).map((c: any) => c._id);

      // Remove subjects under those curricula
      db.subjects = db.subjects.filter((s: any) => !curriculaUnderLibrary.includes(s.curriculum_id));

      // Remove curricula under this library
      db.curricula = db.curricula.filter((c: any) => c.library_id !== id);

      // Remove library itself
      db.libraries.splice(idx, 1);

      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, message: "Library, associated curricula and subjects deleted; books decoupled gracefully." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest(`/user/libraries?id=${id}`, "DELETE", undefined, authCtx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

