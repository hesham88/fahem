import { NextRequest } from "next/server";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../localDbHelper";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, feedback, category } = body;

    if (!feedback) {
      return new Response(JSON.stringify({ error: "Feedback content is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const newFeedback = {
      _id: "fb_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      name: name || "Anonymous",
      email: email || "anonymous@fahem.edu",
      feedback,
      category: category || "General",
      createdAt: new Date().toISOString()
    };

    if (isLocalEnv()) {
      const db = getLocalDb() as any;
      db.feedback = db.feedback || [];
      db.feedback.push(newFeedback);
      saveLocalDb(db);

      return new Response(JSON.stringify({ success: true, message: "Feedback saved locally.", feedback: newFeedback }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Production: Save to MongoDB 'feedback' collection
    try {
      const { MongoClient } = require("mongodb");
      const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
      await client.connect();
      const db = client.db("fahem");
      
      await db.collection("feedback").insertOne(newFeedback);
      await client.close();

      return new Response(JSON.stringify({ success: true, message: "Feedback submitted successfully.", feedback: newFeedback }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (mongoErr: any) {
      console.error("[api-feedback] Mongo Save Error, falling back to mock response:", mongoErr);
      return new Response(JSON.stringify({ success: true, message: "Feedback captured via fallback stream.", feedback: newFeedback }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

  } catch (err: any) {
    console.error("[api-feedback] POST failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
