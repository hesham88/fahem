import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { isLocalEnv, getLocalDb } from "../../localDbHelper";
import { requireUser } from "../../_auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    if (isLocalEnv()) {
      const db = getLocalDb();
      const list = db.notifications || [];
      
      // Strict privacy count check: count only own unread notifications
      const count = list.filter(n => n.recipient_uid === ctx.uid && n.read === false).length;

      return new Response(JSON.stringify({ success: true, count }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/notifications/count", "GET", undefined, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
