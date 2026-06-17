import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { verifyAuth } from "../../_auth";

export const dynamic = "force-dynamic";

// FC9.14: persistent, email-keyed XP + streak (points/streak survive regardless of how the
// activity log is read; never reset by crowding or uid fragmentation).
export async function GET(req: NextRequest) {
  try {
    const ctx = await verifyAuth(req);
    if (!ctx) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const email = (ctx.email || "").trim().toLowerCase();
    if (!email) return new Response(JSON.stringify({ stats: {} }), { status: 200, headers: { "Content-Type": "application/json" } });
    return await proxyRequest(`/user/stats?userEmail=${encodeURIComponent(email)}`, "GET", undefined, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
