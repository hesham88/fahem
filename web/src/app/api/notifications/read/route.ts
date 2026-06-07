import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../../localDbHelper";
import { requireUser } from "../../_auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json().catch(() => ({}));
    const notification_ids = body.notification_ids || [];

    if (isLocalEnv()) {
      const db = getLocalDb();
      const list = db.notifications || [];
      
      list.forEach(n => {
        if (n.recipient_uid === ctx.uid) {
          if (notification_ids.length === 0 || notification_ids.includes(n._id)) {
            n.read = true;
          }
        }
      });
      
      db.notifications = list;
      saveLocalDb(db);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/notifications/read", "POST", { notification_ids }, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
