import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { requireUser } from "../../_auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const { parentEmail, childId } = body;

    if (!parentEmail || !childId) {
      return new Response(JSON.stringify({ error: "parentEmail and childId are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // IDOR Protection: Standard users can only approve their own children
    const isSelf = ctx.email && ctx.email.toLowerCase().trim() === parentEmail.toLowerCase().trim();
    const isAdmin = ctx.role === "admin" || ctx.role === "super-admin";

    if (!isSelf && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: You do not have permission to approve this relationship" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/parent/approve", "POST", { parentEmail, childId }, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

