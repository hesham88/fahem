import { NextRequest } from "next/server";
import { requireUser } from "../_auth";
import { isLocalEnv, getLocalDb, saveLocalDb, shouldSkipDirectMongo } from "../localDbHelper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const uid = ctx.uid;
    let sessions: any[] = [];
    let mongoClient: any = null;

    if (isLocalEnv()) {
      const db = getLocalDb();
      sessions = db.reading_sessions || [];
      sessions = sessions.filter((s: any) => s.uid === uid);
    } else {
      try {
        if (!shouldSkipDirectMongo()) {
          const { MongoClient } = require("mongodb");
          const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
          mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
          await mongoClient.connect();
          const db = mongoClient.db("fahem");
          sessions = await db.collection("reading_sessions").find({ uid: uid }).toArray();
          await mongoClient.close();
        }
      } catch (mongoErr) {
        console.error("[api-reading-session GET] MongoDB connection failed:", mongoErr);
      }
    }

    return new Response(JSON.stringify({ success: true, sessions }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("[api-reading-session GET] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const {
      bookId,
      curriculumId,
      subjectId,
      pageNumber,
      durationIncrement = 0,
      action,
      tokens = 0
    } = body;

    if (!bookId || pageNumber === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: bookId or pageNumber" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const uid = ctx.uid;
    const sessionKey = `rs_${uid}_${bookId}`;

    let session: any = null;
    let localDb: any = null;
    let mongoClient: any = null;

    if (isLocalEnv()) {
      localDb = getLocalDb();
      if (!localDb.reading_sessions) {
        localDb.reading_sessions = [];
      }
      session = localDb.reading_sessions.find((s: any) => s._id === sessionKey);
    } else {
      try {
        if (!shouldSkipDirectMongo()) {
          const { MongoClient } = require("mongodb");
          const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
          mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
          await mongoClient.connect();
          const db = mongoClient.db("fahem");
          session = await db.collection("reading_sessions").findOne({ _id: sessionKey });
        }
      } catch (mongoErr) {
        console.error("[api-reading-session] MongoDB connection failed, trying fallback:", mongoErr);
      }
    }

    const now = Date.now();

    if (!session) {
      // Create new session
      session = {
        _id: sessionKey,
        uid: uid,
        book_id: bookId,
        curriculum_id: curriculumId || "",
        subject_id: subjectId || "",
        first_opened_at: now,
        last_active_at: now,
        last_page: Number(pageNumber),
        pages_visited: [Number(pageNumber)],
        max_page: Number(pageNumber),
        duration_seconds: Number(durationIncrement),
        action_counts: {
          audio: action === "audio" ? 1 : 0,
          translate: action === "translate" ? 1 : 0,
          explain: action === "explain" ? 1 : 0,
          question: action === "question" ? 1 : 0
        },
        tokens_spent: Number(tokens)
      };
    } else {
      // Update existing session
      const visited = session.pages_visited || [];
      const numPage = Number(pageNumber);
      if (!visited.includes(numPage)) {
        visited.push(numPage);
      }

      const actions = session.action_counts || { audio: 0, translate: 0, explain: 0, question: 0 };
      if (action && typeof action === "string") {
        actions[action] = (actions[action] || 0) + 1;
      }

      session.last_active_at = now;
      session.last_page = numPage;
      session.pages_visited = visited;
      session.max_page = Math.max(session.max_page || 0, numPage);
      session.duration_seconds = (session.duration_seconds || 0) + Number(durationIncrement);
      session.action_counts = actions;
      session.tokens_spent = (session.tokens_spent || 0) + Number(tokens);
    }

    // Save back to db
    if (isLocalEnv()) {
      const idx = localDb.reading_sessions.findIndex((s: any) => s._id === sessionKey);
      if (idx !== -1) {
        localDb.reading_sessions[idx] = session;
      } else {
        localDb.reading_sessions.push(session);
      }
      saveLocalDb(localDb);
    } else if (mongoClient) {
      const db = mongoClient.db("fahem");
      await db.collection("reading_sessions").updateOne(
        { _id: sessionKey },
        { $set: session },
        { upsert: true }
      );
      await mongoClient.close();
    }

    return new Response(JSON.stringify({ success: true, session }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("[api-reading-session] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
