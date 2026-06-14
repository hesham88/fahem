import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { verifyAuth } from "../../_auth";

export const dynamic = "force-dynamic";

// On demo sign-out: archive the session's data+metadata to the sandbox temp collection and purge
// its per-session traces. Best-effort — the backend reads the sandbox_session_id from the principal.
export async function POST(req: NextRequest) {
  const ctx = await verifyAuth(req);
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (!body.sandbox_session_id && ctx.sandbox_session_id) {
    body.sandbox_session_id = ctx.sandbox_session_id;
  }
  return await proxyRequest("/demo/signout", "POST", body, ctx);
}
