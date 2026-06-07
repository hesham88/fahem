import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { isLocalEnv, checkFocusLockLocal } from "../../localDbHelper";
import { requireUser } from "../../_auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    if (isLocalEnv()) {
      const lock = checkFocusLockLocal(ctx.uid, ctx.role);
      return new Response(JSON.stringify(lock), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/assignments/focus-lock", "GET", undefined, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
