import { NextRequest } from "next/server";
import { proxyRequest } from "../proxy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest(`/user/chat-session?userId=${encodeURIComponent(userId)}`, "GET");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, userId, userEmail, title, messages } = body;

    if (!sessionId || !userId || !userEmail) {
      return new Response(JSON.stringify({ error: "sessionId, userId, and userEmail are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/user/chat-session", "POST", {
      sessionId,
      userId,
      userEmail,
      title,
      messages
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest(`/user/chat-session?sessionId=${encodeURIComponent(sessionId)}`, "DELETE");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
