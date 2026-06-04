import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { isLocalEnv, getLocalDb } from "../../localDbHelper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      const session = (db.chat_sessions || []).find((s: any) => s.sessionId === sessionId);
      if (session) {
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

    return await proxyRequest(`/user/chat-session/detail?sessionId=${encodeURIComponent(sessionId)}`, "GET");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
