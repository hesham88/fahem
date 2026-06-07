import { NextRequest } from "next/server";
import { proxyRequest } from "../proxy";
import { isLocalEnv, getLocalDb } from "../localDbHelper";
import { requireUser } from "../_auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") || "false";

    if (isLocalEnv()) {
      const db = getLocalDb();
      let list = db.notifications || [];
      
      // Strict privacy check: only fetch notifications for self
      list = list.filter(n => n.recipient_uid === ctx.uid);
      
      if (unreadOnly === "true") {
        list = list.filter(n => n.read === false);
      }
      
      // Sort by createdAt descending
      list = [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      return new Response(JSON.stringify({ success: true, notifications: list }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest(`/notifications?unreadOnly=${unreadOnly}`, "GET", undefined, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
