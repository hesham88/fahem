import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { verifyAuth } from "../../_auth";
import { isLocalEnv, getLocalDb, saveLocalDb, checkFocusLockLocal } from "../../localDbHelper";

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
    const senderId = searchParams.get("senderId");
    const recipientId = searchParams.get("recipientId");
    const isGroup = searchParams.get("isGroup") === "true";

    if (!senderId || !recipientId) {
      return new Response(JSON.stringify({ error: "senderId and recipientId are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // IDOR Protection: Standard users can only retrieve messages where they are a party
    const isParticipant = ctx.uid === senderId || ctx.uid === recipientId;
    const isAdmin = ctx.role === "admin" || ctx.role === "super-admin";

    if (!isParticipant && !isAdmin && !isGroup) {
      return new Response(JSON.stringify({ error: "Forbidden: You do not have permission to view these messages" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      const messages = (db as any).chat_messages || [];
      const chatMessages = messages.filter((msg: any) => {
        if (isGroup) {
          return msg.recipientId === recipientId;
        } else {
          return (msg.senderId === senderId && msg.recipientId === recipientId) ||
                 (msg.senderId === recipientId && msg.recipientId === senderId);
        }
      });
      return new Response(JSON.stringify({ success: true, messages: chatMessages }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest(
      `/chat/message?senderId=${encodeURIComponent(senderId)}&recipientId=${encodeURIComponent(recipientId)}&isGroup=${isGroup}`,
      "GET",
      undefined,
      ctx
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
    const ctx = await verifyAuth(req);
    if (!ctx) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Focus Lock Check (Suppress messaging during active assignments or solo practice)
    if (isLocalEnv()) {
      const lock = checkFocusLockLocal(ctx.uid, ctx.role);
      if (lock.locked) {
        return new Response(JSON.stringify({ error: lock.message, focusLocked: true }), {
          status: 423,
          headers: { "Content-Type": "application/json" }
        });
      }
    } else {
      try {
        const { checkFocusLockProd } = require("../../assignments/helper");
        const lock = await checkFocusLockProd(ctx.uid, ctx.role);
        if (lock.locked) {
          return new Response(JSON.stringify({ error: lock.message, focusLocked: true }), {
            status: 423,
            headers: { "Content-Type": "application/json" }
          });
        }
      } catch (err) {
        console.error("Failed to check focus lock in production:", err);
      }
    }

    const body = await req.json();
    const { senderName, recipientId, content, isGroup } = body;
    let senderId = body.senderId;

    if (!recipientId || !content) {
      return new Response(JSON.stringify({ error: "recipientId and content are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Force senderId to match authenticated user session unless they are admin/super-admin
    const isAdmin = ctx.role === "admin" || ctx.role === "super-admin";
    if (!senderId || !isAdmin) {
      senderId = ctx.uid;
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      if (!(db as any).chat_messages) {
        (db as any).chat_messages = [];
      }
      const newMsg = {
        senderId,
        senderName: senderName || ctx.email?.split("@")[0] || "User",
        recipientId,
        content,
        isGroup: !!isGroup,
        timestamp: new Date().toISOString()
      };
      (db as any).chat_messages.push(newMsg);
      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, message: newMsg }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/chat/message", "POST", {
      senderId,
      senderName: senderName || ctx.email?.split("@")[0] || "User",
      recipientId,
      content,
      isGroup
    }, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
