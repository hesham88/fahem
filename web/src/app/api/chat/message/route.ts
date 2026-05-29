import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const senderId = searchParams.get("senderId");
    const recipientId = searchParams.get("recipientId");
    const isGroup = searchParams.get("isGroup") === "true";

    if (!senderId || !recipientId) {
      return new Response(JSON.stringify({ error: "senderId and recipientId are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest(
      `/chat/message?senderId=${encodeURIComponent(senderId)}&recipientId=${encodeURIComponent(recipientId)}&isGroup=${isGroup}`,
      "GET"
    );
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
    const { senderId, senderName, recipientId, content, isGroup } = body;

    if (!senderId || !senderName || !recipientId || !content) {
      return new Response(JSON.stringify({ error: "senderId, senderName, recipientId, and content are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/chat/message", "POST", {
      senderId,
      senderName,
      recipientId,
      content,
      isGroup
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
