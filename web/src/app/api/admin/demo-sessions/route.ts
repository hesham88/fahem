import { NextRequest } from "next/server";
import { getLocalDb, isLocalEnv } from "../../localDbHelper";
import { requireAdmin } from "../../_auth";
import { proxyRequest } from "../../proxy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;

    let sessions = [];

    if (isLocalEnv()) {
      const db = getLocalDb() as any;
      sessions = db.demo_sessions || [];
    } else {
      // Production: query Mongo via Cloud Run backend proxy
      const proxyRes = await proxyRequest("/admin/demo-sessions", "GET", undefined, ctx);
      if (proxyRes.ok) {
        const data = await proxyRes.json();
        if (data.success) {
          sessions = data.sessions || [];
        }
      } else {
        throw new Error(`Backend demo-sessions query failed: ${proxyRes.statusText}`);
      }
    }

    return new Response(JSON.stringify({ success: true, sessions }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[admin-demo-sessions-api] GET failed:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
