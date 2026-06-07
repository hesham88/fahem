import { NextRequest } from "next/server";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../localDbHelper";
import { requireUser } from "../_auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const { name, email, feedback, category, source, title, context } = body;

    // Body text is either 'feedback' (from InlineFeedbackCard) or 'body'
    const reportBody = body.body || feedback;
    if (!reportBody) {
      return new Response(JSON.stringify({ error: "Report content is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayMs = startOfDay.getTime();

    // Enforce 3/day report limit per user
    if (isLocalEnv()) {
      const db = getLocalDb() as any;
      db.reports = db.reports || [];
      const recentReports = db.reports.filter(
        (rep: any) => rep.userId === ctx.uid && rep.createdAt >= startOfDayMs
      );
      if (recentReports.length >= 3) {
        return new Response(JSON.stringify({ error: "daily limit reached." }), {
          status: 429,
          headers: { "Content-Type": "application/json" }
        });
      }
    } else {
      const { MongoClient } = require("mongodb");
      const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
      await client.connect();
      const db = client.db("fahem");
      
      const count = await db.collection("reports").countDocuments({
        userId: ctx.uid,
        createdAt: { $gte: startOfDayMs }
      });
      await client.close();

      if (count >= 3) {
        return new Response(JSON.stringify({ error: "daily limit reached." }), {
          status: 429,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    const reportId = "rep_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    const newReport = {
      _id: reportId,
      userId: ctx.uid,
      source: source || "footer",
      category: category || "General",
      title: title || category || "Feedback Report",
      body: reportBody,
      context: context || { name: name || "Anonymous", email: email || ctx.email || "anonymous@fahem.edu" },
      status: "new",
      createdAt: Date.now()
    };

    if (isLocalEnv()) {
      const db = getLocalDb() as any;
      db.reports = db.reports || [];
      db.reports.push(newReport);
      saveLocalDb(db);

      return new Response(JSON.stringify({ success: true, message: "Report saved locally.", report: newReport }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Production: Save directly to MongoDB 'reports' collection
    const { MongoClient } = require("mongodb");
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
    await client.connect();
    const db = client.db("fahem");
    
    await db.collection("reports").insertOne(newReport);
    await client.close();

    return new Response(JSON.stringify({ success: true, message: "Report submitted successfully.", report: newReport }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[api-feedback] POST failed:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
