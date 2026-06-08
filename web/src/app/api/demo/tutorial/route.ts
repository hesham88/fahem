import { NextRequest } from "next/server";
import { getLocalDb, saveLocalDb, isLocalEnv } from "../../localDbHelper";
import { verifyAuth } from "../../_auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authCtx = await verifyAuth(req);
    if (!authCtx || !authCtx.sandbox_session_id) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized or not in demo session" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json().catch(() => ({}));
    const { tutorial_shown, tutorial_skipped, tutorial_step_reached } = body;

    const db = getLocalDb() as any;
    db.demo_sessions = db.demo_sessions || [];
    const index = db.demo_sessions.findIndex((s: any) => s.sandbox_session_id === authCtx.sandbox_session_id);

    const updateFields: any = {};
    if (typeof tutorial_shown === "boolean") updateFields.tutorial_shown = tutorial_shown;
    if (typeof tutorial_skipped === "boolean") updateFields.tutorial_skipped = tutorial_skipped;
    if (typeof tutorial_step_reached === "number") updateFields.tutorial_step_reached = tutorial_step_reached;

    if (index !== -1) {
      db.demo_sessions[index] = {
        ...db.demo_sessions[index],
        ...updateFields,
        last_active_at: Math.floor(Date.now() / 1000)
      };
      saveLocalDb(db);
    }

    if (!isLocalEnv()) {
      try {
        const { proxyRequest } = require("../../proxy");
        const proxyRes = await proxyRequest("/user/demo/tutorial", "POST", {
          sandbox_session_id: authCtx.sandbox_session_id,
          tutorial_shown,
          tutorial_skipped,
          tutorial_step_reached
        }, authCtx);
        if (!proxyRes.ok) {
          console.error("[demo-tutorial] Failed to update demo session via proxy:", await proxyRes.text());
        }
      } catch (err) {
        console.error("[demo-tutorial] Failed to proxy update demo session:", err);
      }
    }

    return new Response(JSON.stringify({ success: true, updated: updateFields }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("[demo-tutorial] POST failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
