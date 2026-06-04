import { NextRequest } from "next/server";
import { isLocalEnv, getLocalDb } from "../../localDbHelper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get("bookId");
    const jobId = searchParams.get("jobId") || (bookId ? `job_${bookId}` : null);

    if (isLocalEnv()) {
      const db = getLocalDb() as any;
      const jobs = db.ingestion_jobs || [];

      if (jobId) {
        const job = jobs.find((j: any) => j._id === jobId);
        if (!job) {
          return new Response(JSON.stringify({ error: "Job metadata not found locally." }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ success: true, job }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true, jobs }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // MongoDB production lookup
    try {
      const { MongoClient } = require("mongodb");
      const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
      await client.connect();
      const db = client.db("fahem");

      if (jobId) {
        const job = await db.collection("ingestion_jobs").findOne({ _id: jobId });
        await client.close();
        if (!job) {
          return new Response(JSON.stringify({ error: "Job metadata not found in database." }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ success: true, job }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      const jobs = await db.collection("ingestion_jobs").find({}).sort({ updated_at: -1 }).toArray();
      await client.close();
      return new Response(JSON.stringify({ success: true, jobs }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (mongoErr: any) {
      return new Response(JSON.stringify({ error: `Database offline: ${mongoErr.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
