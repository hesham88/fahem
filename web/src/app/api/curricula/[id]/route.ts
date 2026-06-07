import { NextRequest } from "next/server";
import { requireAdmin } from "../../_auth";
import { proxyRequest } from "../../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../../localDbHelper";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const authCtx = await requireAdmin(req);
    if (authCtx instanceof Response) return authCtx;

    const { id } = params;
    const payload = await req.json();

    if (isLocalEnv()) {
      const db = getLocalDb();
      db.curricula = db.curricula || [];

      const idx = db.curricula.findIndex((c: any) => c._id === id);
      if (idx < 0) {
        return new Response(JSON.stringify({ error: `Curriculum with ID '${id}' not found` }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      db.curricula[idx] = {
        ...db.curricula[idx],
        ...payload,
        updated_at: new Date().toISOString()
      };

      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, curriculum: db.curricula[idx] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest(`/user/curricula/${id}`, "PATCH", payload, authCtx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
