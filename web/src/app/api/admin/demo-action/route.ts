import { NextRequest } from "next/server";
import { getLocalDb, saveLocalDb, isLocalEnv } from "../../localDbHelper";
import { requireAdmin } from "../../_auth";
import { proxyRequest } from "../../proxy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const { action, sandbox_session_id, quota_value } = body;

    if (!sandbox_session_id) {
      return new Response(JSON.stringify({ error: "sandbox_session_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (action !== "kill" && action !== "quota") {
      return new Response(JSON.stringify({ error: "Invalid action. Must be 'kill' or 'quota'." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb() as any;
      db.demo_sessions = db.demo_sessions || [];
      const index = db.demo_sessions.findIndex((s: any) => s.sandbox_session_id === sandbox_session_id);
      
      if (index === -1) {
        return new Response(JSON.stringify({ error: "Demo session not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (action === "kill") {
        db.demo_sessions[index].status = "killed";
        db.demo_sessions[index].ended_at = Math.floor(Date.now() / 1000);
        db.demo_sessions[index].kill_reason = "Admin intervention";
      } else if (action === "quota") {
        db.demo_sessions[index].token_budget = Number(quota_value) || 250000;
      }

      saveLocalDb(db);
    } else {
      // Production: proxy to Python backend
      const proxyRes = await proxyRequest("/admin/demo-action", "POST", body, ctx);
      if (proxyRes.ok) {
        const data = await proxyRes.json();
        if (!data.success) {
          return new Response(JSON.stringify({ error: data.error || "Failed to execute demo action on backend." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
      } else {
        throw new Error(`Backend demo-action POST failed: ${proxyRes.statusText}`);
      }
    }

    // Also log admin action in audit log/activities
    const db = getLocalDb();
    db.user_activities = db.user_activities || [];
    db.user_activities.push({
      userId: ctx.uid,
      action: `demo_${action}`,
      timestamp: new Date().toISOString(),
      details: { sandbox_session_id, quota_value, admin: ctx.email }
    });
    saveLocalDb(db);

    return new Response(JSON.stringify({ success: true, message: `Action '${action}' executed successfully.` }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[admin-demo-action-api] POST failed:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
