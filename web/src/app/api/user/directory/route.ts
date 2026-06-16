import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { isLocalEnv, getLocalDb } from "../../localDbHelper";
import { requireUser } from "../../_auth";
import { toPublicProfile } from "../publicProjection";

export const dynamic = "force-dynamic";

// FC8 — Public member directory.
//
// Powers the "Discover Members & Directory" panel and the public-profile friend
// circle for EVERY authenticated member (not just admins — that was the bug:
// /api/user/list is requireAdmin, so normal users saw an empty directory). Admins
// keep the full record (parity with /api/user/list); everyone else gets the
// PII-free public projection. Pending/unapproved-underage accounts are hidden to
// respect the platform's COPPA posture.
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const isAdmin = ctx.role === "admin" || ctx.role === "super-admin";

    const shape = (users: any[]): any[] =>
      (Array.isArray(users) ? users : [])
        .filter((u: any) => u && u.userId)
        .filter((u: any) => u.isApproved !== false) // hide pending/underage-unapproved members (COPPA)
        .map((u: any) => (isAdmin ? u : toPublicProfile(u)));

    if (isLocalEnv()) {
      const db = getLocalDb();
      return new Response(JSON.stringify({ success: true, users: shape(db.users || []) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const res = await proxyRequest("/user/list", "GET", undefined, ctx);
    if (!res.ok) return res;
    const data = await res.json();
    return new Response(JSON.stringify({ success: true, users: shape(data.users || []) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
