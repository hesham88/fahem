import { NextRequest } from "next/server";
import { proxyRequest } from "../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../localDbHelper";

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

    if (isLocalEnv()) {
      const db = getLocalDb();
      if (!db.chat_sessions) {
        db.chat_sessions = [];
      }
      const existingIndex = db.chat_sessions.findIndex((s: any) => s.sessionId === sessionId);
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

    if (isLocalEnv()) {
      const db = getLocalDb();
      if (db.chat_sessions) {
        db.chat_sessions = db.chat_sessions.filter((s: any) => s.sessionId !== sessionId);
        saveLocalDb(db);
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
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

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, title } = body;

    if (!sessionId || !title) {
      return new Response(JSON.stringify({ error: "sessionId and title are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      if (!db.chat_sessions) {
        db.chat_sessions = [];
      }
      const existing = db.chat_sessions.find((s: any) => s.sessionId === sessionId);
      if (existing) {
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
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
