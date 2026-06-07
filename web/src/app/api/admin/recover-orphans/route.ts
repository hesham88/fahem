import { NextRequest } from "next/server";
import { isLocalEnv } from "../../localDbHelper";
import { proxyRequest } from "../../proxy";
import { requireAdmin } from "../../_auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // defaults to true for safety

    // Proxy the request directly to the Cloud Run agent backend
    return await proxyRequest("/admin/recover-orphans", "POST", { dry_run: dryRun }, ctx);

  } catch (err: any) {
    console.error("[admin-recover-orphans] POST failed:", err);
    return new Response(JSON.stringify({ success: false, error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
