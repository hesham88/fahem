import { NextRequest } from "next/server";
import { isLocalEnv } from "../../localDbHelper";
import { proxyRequest } from "../../proxy";
import { requireAdmin } from "../../_auth";
import { getAuth } from "firebase-admin/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // defaults to true for safety

    // Fetch Firebase Auth Users for backfilling (R22)
    let authUsers: Array<{ uid: string, email: string | null, displayName: string | null }> = [];
    try {
      const auth = getAuth();
      const listResult = await auth.listUsers(1000);
      authUsers = listResult.users.map(u => ({
        uid: u.uid,
        email: u.email || null,
        displayName: u.displayName || null
      }));
    } catch (authErr) {
      console.error("[admin-recover-orphans] Failed to retrieve firebase auth users:", authErr);
    }

    // Proxy the request directly to the Cloud Run agent backend, forwarding the firebase auth users list
    return await proxyRequest("/admin/recover-orphans", "POST", { dry_run: dryRun, auth_users: authUsers }, ctx);

  } catch (err: any) {
    console.error("[admin-recover-orphans] POST failed:", err);
    return new Response(JSON.stringify({ success: false, error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
