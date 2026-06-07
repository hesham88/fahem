import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { verifyAuth } from "../../_auth";
import { isLocalEnv, getLocalDb } from "../../localDbHelper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await verifyAuth(req);
    if (!ctx) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const isAdmin = ctx.role === "admin" || ctx.role === "super-admin";

    if (isLocalEnv()) {
      const db = getLocalDb();
      const session = (db.chat_sessions || []).find((s: any) => s.sessionId === sessionId);
      if (session) {
        if (session.userId !== ctx.uid && !isAdmin) {
          return new Response(JSON.stringify({ error: "Forbidden: You do not have permission to view this session" }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ session }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } else {
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    return await proxyRequest(`/user/chat-session/detail?sessionId=${encodeURIComponent(sessionId)}`, "GET", undefined, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
