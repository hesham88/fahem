import { NextRequest } from "next/server";
import { proxyRequest } from "../proxy";
import { verifyAuth } from "../_auth";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../localDbHelper";

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
    let userId = searchParams.get("userId");

    if (!userId) {
      userId = ctx.uid;
    }

    // IDOR Protection: Standard users can only view their own history
    const isSelf = userId === ctx.uid;
    const isAdmin = ctx.role === "admin" || ctx.role === "super-admin";

    if (!isSelf && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: You do not have permission to view these chat sessions" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      const sessions = db.chat_sessions || [];
      const userSessions = sessions
        .filter((s: any) => s.userId === userId)
        .map((s: any) => ({
          sessionId: s.sessionId,
          userId: s.userId,
          userEmail: s.userEmail,
          title: s.title,
          messageCount: s.messages ? s.messages.length : 0,
          updatedAt: s.updatedAt || new Date().toISOString()
        }))
        .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return new Response(JSON.stringify({ sessions: userSessions }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest(`/user/chat-session?userId=${encodeURIComponent(userId)}`, "GET", undefined, ctx);
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

    const body = await req.json();
    const { sessionId, title, messages } = body;
    let userId = body.userId;
    let userEmail = body.userEmail;

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Bind identity strictly to verified caller session
    const isAdmin = ctx.role === "admin" || ctx.role === "super-admin";
    if (!userId || !isAdmin) {
      userId = ctx.uid;
      userEmail = ctx.email ?? "anonymous@fahem.app";
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      if (!db.chat_sessions) {
        db.chat_sessions = [];
      }
      const existingIndex = db.chat_sessions.findIndex((s: any) => s.sessionId === sessionId);
      
      // IDOR Protection for update
      if (existingIndex > -1 && db.chat_sessions[existingIndex].userId !== ctx.uid && !isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden: You do not own this chat session" }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }

      const now = new Date().toISOString();
      if (existingIndex > -1) {
        const existing = db.chat_sessions[existingIndex];
        db.chat_sessions[existingIndex] = {
          ...existing,
          title: title || existing.title,
          messages: messages || existing.messages,
          updatedAt: now
        };
      } else {
        db.chat_sessions.push({
          sessionId,
          userId,
          userEmail,
          title: title || "Untitled Chat",
          messages: messages || [],
          updatedAt: now,
          createdAt: now
        });
      }
      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, sessionId }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/user/chat-session", "POST", {
      sessionId,
      userId,
      userEmail: userEmail || ctx.email || "anonymous@fahem.app",
      title,
      messages
    }, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function DELETE(req: NextRequest) {
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
      if (db.chat_sessions) {
        const session = db.chat_sessions.find((s: any) => s.sessionId === sessionId);
        if (session && session.userId !== ctx.uid && !isAdmin) {
          return new Response(JSON.stringify({ error: "Forbidden: You do not own this chat session" }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
        db.chat_sessions = db.chat_sessions.filter((s: any) => s.sessionId !== sessionId);
        saveLocalDb(db);
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest(`/user/chat-session?sessionId=${encodeURIComponent(sessionId)}`, "DELETE", undefined, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await verifyAuth(req);
    if (!ctx) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const { sessionId, title } = body;

    if (!sessionId || !title) {
      return new Response(JSON.stringify({ error: "sessionId and title are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const isAdmin = ctx.role === "admin" || ctx.role === "super-admin";

    if (isLocalEnv()) {
      const db = getLocalDb();
      if (!db.chat_sessions) {
        db.chat_sessions = [];
      }
      const existing = db.chat_sessions.find((s: any) => s.sessionId === sessionId);
      if (existing) {
        if (existing.userId !== ctx.uid && !isAdmin) {
          return new Response(JSON.stringify({ error: "Forbidden: You do not own this chat session" }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
        existing.title = title;
        existing.updatedAt = new Date().toISOString();
        saveLocalDb(db);
        return new Response(JSON.stringify({ success: true }), {
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

    return await proxyRequest("/user/chat-session/rename", "POST", {
      sessionId,
      title
    }, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
