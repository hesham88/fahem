import { NextRequest } from "next/server";
import { verifyAuth } from "../../_auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await verifyAuth(req);
    if (!ctx) {
      return new Response(JSON.stringify({ isAdmin: false, isSuperadmin: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const isAdmin = ctx.role === "admin" || ctx.role === "super-admin";
    const isSuperadmin = ctx.role === "super-admin";

    return new Response(JSON.stringify({ isAdmin, isSuperadmin, email: ctx.email, role: ctx.role }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (e: any) {
    console.error("[admin-check] Error validating admin status:", e);
    return new Response(JSON.stringify({ isAdmin: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
