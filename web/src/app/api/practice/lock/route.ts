import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../../localDbHelper";
import { requireUser } from "../../_auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const { active } = body;

    if (isLocalEnv()) {
      const db = getLocalDb();
      if (!db.active_practice_sessions) {
        db.active_practice_sessions = [];
      }

      if (active) {
        const existingIdx = db.active_practice_sessions.findIndex((ps: any) => ps.uid === ctx.uid);
        if (existingIdx !== -1) {
          db.active_practice_sessions[existingIdx].started_at = Math.floor(Date.now() / 1000);
        } else {
          db.active_practice_sessions.push({
            uid: ctx.uid,
            started_at: Math.floor(Date.now() / 1000)
          });
        }
      } else {
        db.active_practice_sessions = db.active_practice_sessions.filter((ps: any) => ps.uid !== ctx.uid);
      }

      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/practice/lock", "POST", body, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
