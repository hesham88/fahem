import { NextRequest } from "next/server";
import { requireAdmin } from "../../_auth";
import { isLocalEnv, getLocalDb, saveLocalDb, getDbTarget } from "../../localDbHelper";
import { proxyRequest } from "../../proxy";
import { spawn } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

// Global map to track active jobs
declare global {
  var activeBookJobs: Map<string, any> | undefined;
}

if (!global.activeBookJobs) {
  global.activeBookJobs = new Map();
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;

    const { bookId, jobId, action } = await req.json();
    const requesterEmail = ctx.email || "anonymous@fahem.app";

    if (!bookId || !action) {
      return new Response(JSON.stringify({ error: "Missing required fields: bookId, action" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!isLocalEnv()) {
      return await proxyRequest("/user/books/control", "POST", { bookId, jobId, action, requesterEmail }, ctx);
    }

    const resolvedJobId = jobId || `job_${bookId}`;
    const timestamp = new Date().toLocaleTimeString();
    let message = "";
    let success = false;

    // Retrieve active child process if exists in global memory map
    const activeChild = global.activeBookJobs?.get(bookId);

    // ----------------------------------------------------
    // ACTION: PAUSE
    // ----------------------------------------------------
    if (action === "pause") {
      // 1. Cooperative DB pause update
      if (isLocalEnv()) {
        const db = getLocalDb() as any;
        const job = db.ingestion_jobs?.find((j: any) => j._id === resolvedJobId);
        if (job) {
          job.status = "paused";
          job.logs = [
            ...(job.logs || []),
            `[${timestamp}] [CONTROL] ⏸️ Administrative cooperative pause request sent.`
          ];
          job.updated_at = Date.now() / 1000;
          
          const book = db.books?.find((b: any) => b._id === bookId);
          if (book) {
            book.ingestion_status = "paused";
            book.ingestion_logs = job.logs;
            book.updated_at = Date.now() / 1000;
          }
          saveLocalDb(db);
        }
      }

      try {
        const { MongoClient } = require("mongodb");
        const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
        const client = new MongoClient(uri, { serverSelectionTimeoutMS: 1500 });
        await client.connect();
        const db = client.db(getDbTarget());

        const job = await db.collection("ingestion_jobs").findOne({ _id: resolvedJobId });
        if (job) {
          const updatedLogs = [
            ...(job.logs || []),
            `[${timestamp}] [CONTROL] ⏸️ Administrative cooperative pause request sent.`
          ];
          await db.collection("ingestion_jobs").updateOne(
            { _id: resolvedJobId },
            { $set: { status: "paused", logs: updatedLogs, updated_at: Date.now() / 1000 } }
          );
          await db.collection("books").updateOne(
            { _id: bookId },
            { $set: { ingestion_status: "paused", ingestion_logs: updatedLogs, updated_at: Date.now() / 1000 } }
          );
        }
        await client.close();
      } catch (mongoErr) {}

      message = "Ingestion job set to pause state. Processing threads are cooperatively resting.";
      success = true;
    }

    // ----------------------------------------------------
    // ACTION: RESUME
    // ----------------------------------------------------
    else if (action === "resume") {
      // 1. Cooperative DB resume update
      if (isLocalEnv()) {
        const db = getLocalDb() as any;
        const job = db.ingestion_jobs?.find((j: any) => j._id === resolvedJobId);
        if (job) {
          job.status = "processing";
          job.logs = [
            ...(job.logs || []),
            `[${timestamp}] [CONTROL] ▶️ Administrative cooperative resume request sent. Activating processing thread.`
          ];
          job.updated_at = Date.now() / 1000;
          
          const book = db.books?.find((b: any) => b._id === bookId);
          if (book) {
            book.ingestion_status = "processing";
            book.ingestion_logs = job.logs;
            book.updated_at = Date.now() / 1000;
          }
          saveLocalDb(db);
        }
      }

      try {
        const { MongoClient } = require("mongodb");
        const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
        const client = new MongoClient(uri, { serverSelectionTimeoutMS: 1500 });
        await client.connect();
        const db = client.db(getDbTarget());

        const job = await db.collection("ingestion_jobs").findOne({ _id: resolvedJobId });
        if (job) {
          const updatedLogs = [
            ...(job.logs || []),
            `[${timestamp}] [CONTROL] ▶️ Administrative cooperative resume request sent. Activating processing thread.`
          ];
          await db.collection("ingestion_jobs").updateOne(
            { _id: resolvedJobId },
            { $set: { status: "processing", logs: updatedLogs, updated_at: Date.now() / 1000 } }
          );
          await db.collection("books").updateOne(
            { _id: bookId },
            { $set: { ingestion_status: "processing", ingestion_logs: updatedLogs, updated_at: Date.now() / 1000 } }
          );
        }
        await client.close();
      } catch (mongoErr) {}

      message = "Ingestion job set to processing state. Processing thread context resumed.";
      success = true;
    }

    // ----------------------------------------------------
    // ACTION: KILL / STOP
    // ----------------------------------------------------
    else if (action === "kill" || action === "stop") {
      let processKilled = false;

      // 1. Force kill running OS subprocess
      if (activeChild) {
        try {
          activeChild.kill("SIGTERM");
          global.activeBookJobs?.delete(bookId);
          processKilled = true;
          console.log(`[Job Control] Force-killed active background subprocess for book: ${bookId}`);
        } catch (killErr: any) {
          console.error(`[Job Control] Process termination failed: ${killErr.message}`);
        }
      }

      // 2. Persist cancellation logs and status to Local DB
      if (isLocalEnv()) {
        const db = getLocalDb() as any;
        const job = db.ingestion_jobs?.find((j: any) => j._id === resolvedJobId);
        if (job) {
          job.status = "killed";
          job.logs = [
            ...(job.logs || []),
            `[${timestamp}] [CONTROL] 🛑 Ingestion job manually killed/terminated by administrator: ${requesterEmail}`,
            `[${timestamp}] [SYSTEM] Process context released.`
          ];
          job.updated_at = Date.now() / 1000;

          const book = db.books?.find((b: any) => b._id === bookId);
          if (book) {
            book.ingestion_status = "failed";
            book.ingestion_logs = job.logs;
            book.updated_at = Date.now() / 1000;
          }
          saveLocalDb(db);
        }
      }

      // 3. Persist cancellation to MongoDB
      try {
        const { MongoClient } = require("mongodb");
        const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
        const client = new MongoClient(uri, { serverSelectionTimeoutMS: 1500 });
        await client.connect();
        const db = client.db(getDbTarget());

        const job = await db.collection("ingestion_jobs").findOne({ _id: resolvedJobId });
        if (job) {
          const updatedLogs = [
            ...(job.logs || []),
            `[${timestamp}] [CONTROL] 🛑 Ingestion job manually killed/terminated by administrator: ${requesterEmail}`,
            `[${timestamp}] [SYSTEM] Process context released.`
          ];
          await db.collection("ingestion_jobs").updateOne(
            { _id: resolvedJobId },
            { $set: { status: "killed", logs: updatedLogs, updated_at: Date.now() / 1000 } }
          );
          await db.collection("books").updateOne(
            { _id: bookId },
            { $set: { ingestion_status: "failed", ingestion_logs: updatedLogs, updated_at: Date.now() / 1000 } }
          );
        }
        await client.close();
      } catch (mongoErr) {}

      message = processKilled 
        ? "Active backend worker threads terminated immediately." 
        : "Job was not running in memory; status set to failed/killed in database.";
      success = true;
    }

    // Unrecognized Action
    else {
      return new Response(JSON.stringify({ error: `Unrecognized action: ${action}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success, message }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[api-books-control] error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
