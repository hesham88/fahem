import { NextRequest } from "next/server";
import { requireAdmin } from "../../_auth";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../../localDbHelper";
import { proxyRequest } from "../../proxy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;

    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get("bookId");
    const requesterEmail = ctx.email || "anonymous@fahem.app";

    if (!bookId) {
      return new Response(JSON.stringify({ error: "Missing bookId parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    let terminated = false;

    // 1. Terminate running subprocess if registered
    const activeChild = global.activeBookJobs?.get(bookId);
    if (activeChild) {
      try {
        activeChild.kill("SIGTERM");
        global.activeBookJobs?.delete(bookId);
        terminated = true;
        console.log(`[Ingestion Controller] Terminated active background process for bookId: ${bookId}`);
      } catch (killErr: any) {
        console.error(`[Ingestion Controller] Failed to kill process: ${killErr.message}`);
      }
    }

    if (!isLocalEnv()) {
      return await proxyRequest("/user/books/cancel", "POST", { bookId, requesterEmail }, ctx);
    }

    // 2. Persist cancellation in Local DB
    if (isLocalEnv()) {
      const db = getLocalDb() as any;
      const idx = db.books?.findIndex((b: any) => b._id === bookId);
      const timestamp = new Date().toLocaleTimeString();
      const cancelLog = `[${timestamp}] [CANCEL] ⛔ Ingestion task was manually aborted by administrator: ${requesterEmail}`;
      const releaseLog = `[${timestamp}] [INIT] Releasing virtual machine sandboxed processor context.`;
      
      if (idx >= 0) {
        const book = db.books[idx];
        const existingLogs = book.ingestion_logs || [];
        
        book.ingestion_status = "failed";
        book.ingestion_logs = [
          ...existingLogs,
          cancelLog,
          releaseLog
        ];
        book.updated_at = Date.now() / 1000;
      }

      if (db.ingestion_jobs) {
        const jobId = `job_${bookId}`;
        const jobIdx = db.ingestion_jobs.findIndex((j: any) => j._id === jobId);
        if (jobIdx >= 0) {
          const job = db.ingestion_jobs[jobIdx];
          job.status = "failed";
          job.logs = [
            ...(job.logs || []),
            cancelLog,
            releaseLog
          ];
          job.updated_at = Date.now() / 1000;
        }
      }
      
      saveLocalDb(db);
    }

    // 3. Persist cancellation in MongoDB
    try {
      const { MongoClient } = require("mongodb");
      const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 1500 });
      await client.connect();
      const db = client.db("fahem");

      const book = await db.collection("books").findOne({ _id: bookId });
      if (book) {
        const existingLogs = book.ingestion_logs || [];
        const timestamp = new Date().toLocaleTimeString();
        const updatedLogs = [
          ...existingLogs,
          `[${timestamp}] [CANCEL] ⛔ Ingestion task was manually aborted by administrator: ${requesterEmail}`,
          `[${timestamp}] [INIT] Releasing virtual machine sandboxed processor context.`
        ];

        await db.collection("books").updateOne(
          { _id: bookId },
          {
            $set: {
              ingestion_status: "failed",
              ingestion_logs: updatedLogs,
              updated_at: Date.now() / 1000
            }
          }
        );

        await db.collection("ingestion_jobs").updateOne(
          { _id: `job_${bookId}` },
          {
            $set: {
              status: "failed",
              logs: updatedLogs,
              updated_at: Date.now() / 1000
            }
          }
        );
      }
      await client.close();
    } catch (mongoErr) {
      // Ignore Mongo connection fallback
    }

    return new Response(JSON.stringify({
      success: true,
      message: terminated 
        ? "Active indexing process terminated successfully." 
        : "Job not actively running in memory; status set to failed in database."
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[api-books-cancel] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
