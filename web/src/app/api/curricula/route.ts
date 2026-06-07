import { NextRequest } from "next/server";
import { requireUser, requireAdmin } from "../_auth";
import { proxyRequest } from "../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../localDbHelper";

export const dynamic = "force-dynamic";

// Validates the curriculum's scope against the library's scopeSchema
function validateScope(scope: any, scopeSchema: any[]): string | null {
  if (!scope || typeof scope !== "object") {
    return "Scope must be a non-empty object";
  }

  const schemaKeys = scopeSchema.map((s: any) => s.key);
  const scopeKeys = Object.keys(scope);

  // Check if every key in scope exists in the library scopeSchema
  for (const key of scopeKeys) {
    if (!schemaKeys.includes(key)) {
      return `Invalid scope key '${key}'. Not found in library's scopeSchema.`;
    }
  }

  // Validate values for enum types
  for (const schemaItem of scopeSchema) {
    const key = schemaItem.key;
    const value = scope[key];

    if (schemaItem.type === "enum" && value) {
      if (!Array.isArray(schemaItem.options) || !schemaItem.options.includes(value)) {
        return `Invalid value '${value}' for scope dimension '${schemaItem.label}'. Allowed options: ${schemaItem.options?.join(", ")}`;
      }
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const authCtx = await requireUser(req);
    if (authCtx instanceof Response) return authCtx;

    const { searchParams } = new URL(req.url);
    const libraryId = searchParams.get("library_id");

    if (isLocalEnv()) {
      const db = getLocalDb();
      let curricula = db.curricula || [];

      if (libraryId) {
        curricula = curricula.filter((c: any) => c.library_id === libraryId);
      }

      // Respect visibility - regular users can only see public curricula and their own private ones
      const isAdmin = authCtx.role === "admin" || authCtx.role === "super-admin" || authCtx.role === "judge";
      if (!isAdmin) {
        curricula = curricula.filter((c: any) => c.visibility === "public" || (c.visibility === "private" && c.owner_uid === authCtx.uid));
      }

      return new Response(JSON.stringify({ success: true, curricula }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    let proxyPath = "/user/curricula";
    if (libraryId) {
      proxyPath += `?library_id=${encodeURIComponent(libraryId)}`;
    }

    return await proxyRequest(proxyPath, "GET", null, authCtx);
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
    const { _id, library_id, title, title_ar, scope, status, visibility } = payload;

    if (!library_id || !title || !title_ar || !scope) {
      return new Response(JSON.stringify({ error: "Missing required fields: library_id, title, title_ar, scope" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      db.curricula = db.curricula || [];
      db.libraries = db.libraries || [];

      // Find the corresponding library
      const library = db.libraries.find((l: any) => l._id === library_id);
      if (!library) {
        return new Response(JSON.stringify({ error: `Library '${library_id}' not found` }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Validate scope against library's scopeSchema
      const scopeError = validateScope(scope, library.scopeSchema || []);
      if (scopeError) {
        return new Response(JSON.stringify({ error: `Scope validation failed: ${scopeError}` }), {
          status: 422,
          headers: { "Content-Type": "application/json" }
        });
      }

      const curriculumId = _id || `cur_${library_id.replace("lib_", "")}_${Date.now()}`;
      
      const existingIdx = db.curricula.findIndex((c: any) => c._id === curriculumId);
      const curriculum = {
        _id: curriculumId,
        library_id,
        title,
        title_ar,
        scope,
        subject_ids: payload.subject_ids || [],
        status: status || "published",
        visibility: visibility || "public",
        owner_uid: visibility === "private" ? authCtx.uid : null,
        created_by: authCtx.uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        db.curricula[existingIdx] = {
          ...db.curricula[existingIdx],
          ...curriculum,
          updated_at: new Date().toISOString()
        };
      } else {
        db.curricula.push(curriculum);
      }

      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, curriculum }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/user/curricula", "POST", payload, authCtx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
