import { NextRequest } from "next/server";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../../localDbHelper";
import { proxyRequest } from "../../proxy";
import { verifyAuth } from "../../_auth";

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
    const bookId = searchParams.get("bookId");
    const jobId = searchParams.get("jobId") || (bookId ? `job_${bookId}` : null);

    if (!isLocalEnv()) {
      const params = new URLSearchParams();
      if (bookId) params.append("bookId", bookId);
      if (jobId) params.append("jobId", jobId);
      return await proxyRequest(`/user/books/jobs?${params.toString()}`, "GET", null, ctx);
    }

    if (isLocalEnv()) {
      const db = getLocalDb() as any;
      const jobs = db.ingestion_jobs || [];

      // Clean up stale "processing" jobs
      let dbChanged = false;
      const updatedJobs = jobs.map((job: any) => {
        if (job.status === "processing") {
          let isAlive = false;
          if (job.active_pid) {
            try {
              process.kill(job.active_pid, 0);
              isAlive = true;
            } catch (e) {}
          }
          
          if (!isAlive && (!job.active_pid || (Date.now() / 1000 - job.updated_at > 300))) {
            job.status = "failed";
            if (!job.logs) job.logs = [];
            job.logs.push(job.active_pid
              ? `[SYSTEM] Background ingestion pipeline process (PID ${job.active_pid}) is no longer active.`
              : `[SYSTEM] Background ingestion pipeline process failed to initialize or was terminated unexpectedly.`
            );
            job.updated_at = Date.now() / 1000;
            
            // Sync back to books collection
            const book_id = job.metadata?.book_id || job._id.replace("job_", "");
            if (db.books) {
              const book = db.books.find((b: any) => b._id === book_id);
              if (book) {
                book.ingestion_status = "failed";
                book.ingestion_logs = job.logs;
                book.updated_at = Date.now() / 1000;
              }
            }
            dbChanged = true;
          }
        }
        return job;
      });

      if (dbChanged) {
        db.ingestion_jobs = updatedJobs;
        saveLocalDb(db);
      }

      if (jobId) {
        const job = updatedJobs.find((j: any) => j._id === jobId);
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

      return new Response(JSON.stringify({ success: true, jobs: updatedJobs }), {
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
