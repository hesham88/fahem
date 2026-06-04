import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../../localDbHelper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("group_id");
    const threadId = searchParams.get("thread_id");

    if (isLocalEnv()) {
      const db = getLocalDb();
      let threads = db.social_threads || [];

      if (threadId) {
        // Return single thread with its replies nested
        const thread = threads.find(t => t._id === threadId);
        if (!thread) {
          return new Response(JSON.stringify({ error: "Thread not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        const replies = (db.social_replies || []).filter(r => r.thread_id === threadId);
        return new Response(JSON.stringify({ success: true, thread: { ...thread, replies } }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (groupId) {
        threads = threads.filter(t => t.group_id === groupId);
      }

      // Sort by creation date descending
      threads = [...threads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return new Response(JSON.stringify({ success: true, threads }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Proxy to Cloud Run Agent
    let path = "/social/threads";
    if (threadId) {
      path += `?thread_id=${threadId}`;
    } else if (groupId) {
      path += `?group_id=${groupId}`;
    }
    return await proxyRequest(path, "GET");
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
    const { action, group_id, thread_id, title, title_ar, content, content_ar, author_id, author_name, author_avatar } = body;

    if (action === "reply") {
      if (!thread_id || !content || !author_id) {
        return new Response(JSON.stringify({ error: "Missing required fields for reply: thread_id, content, author_id" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (isLocalEnv()) {
        const db = getLocalDb();
        const replyId = "reply_" + Date.now();
        const newReply = {
          _id: replyId,
          thread_id,
          content,
          content_ar: content_ar || content,
          author_id,
          author_name: author_name || "Anonymous Member",
          author_avatar: author_avatar || "👤",
          created_at: new Date().toISOString()
        };

        if (!db.social_replies) db.social_replies = [];
        db.social_replies.push(newReply);

        // Update replies count in thread
        if (db.social_threads) {
          const threadIdx = db.social_threads.findIndex(t => t._id === thread_id);
          if (threadIdx >= 0) {
            db.social_threads[threadIdx].replies_count = (db.social_threads[threadIdx].replies_count || 0) + 1;
          }
        }

        saveLocalDb(db);
        return new Response(JSON.stringify({ success: true, reply: newReply }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Proxy to Cloud Run Agent
      return await proxyRequest("/social/threads", "POST", body);
    }

    // Default: Create a new thread
    if (!group_id || !title || !content || !author_id) {
      return new Response(JSON.stringify({ error: "Missing required fields for thread: group_id, title, content, author_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      const threadId = "thread_" + Date.now();
      const newThread = {
        _id: threadId,
        group_id,
        title,
        title_ar: title_ar || title,
        content,
        content_ar: content_ar || content,
        author_id,
        author_name: author_name || "Anonymous Member",
        author_avatar: author_avatar || "👤",
        created_at: new Date().toISOString(),
        likes_count: 0,
        replies_count: 0
      };

      if (!db.social_threads) db.social_threads = [];
      db.social_threads.push(newThread);
      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, thread: newThread }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Proxy to Cloud Run Agent
    return await proxyRequest("/social/threads", "POST", body);

  } catch (err: any) {
    console.error("[api-social-threads-post] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
