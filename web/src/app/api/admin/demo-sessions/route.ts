import { NextRequest } from "next/server";
import { getLocalDb, isLocalEnv } from "../../localDbHelper";
import { requireAdmin } from "../../_auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;

    let sessions = [];

    if (isLocalEnv()) {
      const db = getLocalDb() as any;
      sessions = db.demo_sessions || [];
    } else {
      // Production: query MongoDB demo_sessions collection
      const { MongoClient } = require("mongodb");
      const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
      await client.connect();
      const db = client.db("fahem");
      
      // Fetch latest 100 sessions sorted by started_at descending
      sessions = await db
        .collection("demo_sessions")
        .find({})
        .sort({ started_at: -1 })
        .limit(100)
        .toArray();
        
      await client.close();
    }

    return new Response(JSON.stringify({ success: true, sessions }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[admin-demo-sessions-api] GET failed:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
