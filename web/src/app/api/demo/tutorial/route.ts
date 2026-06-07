import { NextRequest } from "next/server";
import { getLocalDb, saveLocalDb, isLocalEnv } from "../../localDbHelper";
import { verifyAuth } from "../../_auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authCtx = await verifyAuth(req);
    if (!authCtx || !authCtx.sandbox_session_id) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized or not in demo session" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json().catch(() => ({}));
    const { tutorial_shown, tutorial_skipped, tutorial_step_reached } = body;

    const db = getLocalDb() as any;
    db.demo_sessions = db.demo_sessions || [];
    const index = db.demo_sessions.findIndex((s: any) => s.sandbox_session_id === authCtx.sandbox_session_id);

    const updateFields: any = {};
    if (typeof tutorial_shown === "boolean") updateFields.tutorial_shown = tutorial_shown;
    if (typeof tutorial_skipped === "boolean") updateFields.tutorial_skipped = tutorial_skipped;
    if (typeof tutorial_step_reached === "number") updateFields.tutorial_step_reached = tutorial_step_reached;

    if (index !== -1) {
      db.demo_sessions[index] = {
        ...db.demo_sessions[index],
        ...updateFields,
        last_active_at: Math.floor(Date.now() / 1000)
      };
      saveLocalDb(db);
    }

    if (!isLocalEnv()) {
      try {
        const { MongoClient } = require("mongodb");
        const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
        const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
        await client.connect();
        const mongoDb = client.db("fahem");
        await mongoDb.collection("demo_sessions").updateOne(
          { sandbox_session_id: authCtx.sandbox_session_id },
          { $set: { ...updateFields, last_active_at: Math.floor(Date.now() / 1000) } }
        );
        await client.close();
      } catch (err) {
        console.error("[demo-tutorial] Failed to update demo session in Mongo DB:", err);
      }
    }

    return new Response(JSON.stringify({ success: true, updated: updateFields }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("[demo-tutorial] POST failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
