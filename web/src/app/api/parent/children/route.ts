import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { requireUser } from "../../_auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const { searchParams } = new URL(req.url);
    const parentEmail = searchParams.get("parentEmail");

    if (!parentEmail) {
      return new Response(JSON.stringify({ error: "parentEmail is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // IDOR Protection: Standard users can only view their own children
    const isSelf = ctx.email && ctx.email.toLowerCase().trim() === parentEmail.toLowerCase().trim();
    const isAdmin = ctx.role === "admin" || ctx.role === "super-admin";

    if (!isSelf && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: You do not have permission to view these records" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest(`/parent/children?parentEmail=${encodeURIComponent(parentEmail)}`, "GET", undefined, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

