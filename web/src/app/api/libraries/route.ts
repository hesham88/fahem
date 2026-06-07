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
