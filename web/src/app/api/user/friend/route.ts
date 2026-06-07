import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { requireUser } from "../../_auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const { friendId, action } = body;
    let userId = body.userId;

    if (!friendId || !action) {
      return new Response(JSON.stringify({ error: "friendId and action are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Force userId to match authenticated user session unless they are admin/super-admin
    const isAdmin = ctx.role === "admin" || ctx.role === "super-admin";
    if (!userId || !isAdmin) {
      userId = ctx.uid;
    }

    if (userId === friendId) {
      return new Response(JSON.stringify({ error: "Cannot add yourself as a friend" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/user/friend", "POST", { userId, friendId, action }, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

