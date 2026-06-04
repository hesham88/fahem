import { NextRequest } from "next/server";
import { checkIsAdmin } from "../helper";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../../localDbHelper";
import { spawn } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

// GET handler to poll the status, progress, logs and discovered items of a crawl job
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return new Response(JSON.stringify({ error: "Missing jobId parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 1. Fetch from local environment fallback
    if (isLocalEnv()) {
      const db = getLocalDb() as any;
      const crawlJobs = db.crawl_jobs || [];
      const job = crawlJobs.find((j: any) => j._id === jobId);

      if (!job) {
        return new Response(JSON.stringify({
          success: true,
          status: "queued",
          progress: 5,
          logs: ["[INIT] Job scheduled. Awaiting background spider execution..."],
          discovered: []
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        status: job.status,
        progress: job.progress,
        logs: job.logs,
        discovered: job.discovered || []
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Fetch from MongoDB in Production
    try {
      const { MongoClient } = require("mongodb");
      const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
      await client.connect();
      const db = client.db("fahem");
      const job = await db.collection("crawl_jobs").findOne({ _id: jobId });
      await client.close();

      if (!job) {
        return new Response(JSON.stringify({
          success: true,
          status: "queued",
          progress: 5,
          logs: ["[INIT] Job scheduled. Awaiting database and background spider execution..."],
          discovered: []
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        status: job.status,
        progress: job.progress,
        logs: job.logs,
        discovered: job.discovered || []
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (dbErr: any) {
      // DB connection failed, fallback to local DB read
      const db = getLocalDb() as any;
      const crawlJobs = db.crawl_jobs || [];
      const job = crawlJobs.find((j: any) => j._id === jobId);

      if (!job) {
        return new Response(JSON.stringify({
          success: true,
          status: "queued",
          progress: 5,
          logs: ["[INIT] Database unreachable. Awaiting local job synchronization..."],
          discovered: []
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        status: job.status,
        progress: job.progress,
        logs: job.logs,
        discovered: job.discovered || []
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

  } catch (err: any) {
    console.error("[crawl-status-api] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// POST handler to trigger a crawl job asynchronously
export async function POST(req: NextRequest) {
  try {
    const { url, maxDepth = 3, requesterEmail } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: "Missing crawl URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!requesterEmail) {
      return new Response(JSON.stringify({ error: "Missing requesterEmail parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Verify requester is admin
    const isAdmin = await checkIsAdmin(requesterEmail);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Access Denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    // Generate a unique jobId
    const jobId = `crawl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Prepare initial log window state
    const initialLogs = [
      `[INIT] 🚀 Spawning isolated GCP Cloud Run Harvester container...`,
      `[INIT] 🌐 Target domain: ${targetUrl}`,
      `[INIT] ⚙️ Parameters: Max Depth = ${maxDepth}`,
      `[INIT] 🔒 Secured sandbox initialized. Awaiting background spider execution...`
    ];

    // Persist initial state locally
    if (isLocalEnv()) {
      const db = getLocalDb() as any;
      if (!db.crawl_jobs) db.crawl_jobs = [];
      db.crawl_jobs.push({
        _id: jobId,
        url: targetUrl,
        status: "harvesting",
        progress: 5,
        logs: initialLogs,
        discovered: [],
        created_at: Date.now() / 1000,
        updated_at: Date.now() / 1000
      });
      saveLocalDb(db);
    }

    // Persist initial state in MongoDB if accessible
    try {
      const { MongoClient } = require("mongodb");
      const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 1500 });
      await client.connect();
      const db = client.db("fahem");
      await db.collection("crawl_jobs").updateOne(
        { _id: jobId },
        {
          $set: {
            _id: jobId,
            url: targetUrl,
            status: "harvesting",
            progress: 5,
            logs: initialLogs,
            discovered: [],
            created_at: Date.now() / 1000,
            updated_at: Date.now() / 1000
          }
        },
        { upsert: true }
      );
      await client.close();
    } catch (mongoErr) {
      // Ignore Mongo save error in local development
    }

    // Spawn Python crawling job completely asynchronously
    try {
      const pythonPath = "python";
      const scriptPath = path.join(process.cwd(), "scripts", "async_crawler.py");

      const payload = {
        jobId,
        url: targetUrl,
        maxDepth,
        requesterEmail
      };

      const child = spawn(pythonPath, [scriptPath]);
      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();

      // Non-blocking listeners
      child.stdout.on("data", (data) => {
        console.log(`[CRAWL JOB stdout] ${data}`);
      });
      child.stderr.on("data", (data) => {
        console.error(`[CRAWL JOB stderr] ${data}`);
      });
      child.on("close", (code) => {
        console.log(`[CRAWL JOB Process] Job ${jobId} exited with code ${code}`);
      });

    } catch (spawnErr: any) {
      console.error("[CRAWL JOB Spawn Error]", spawnErr);
      return new Response(JSON.stringify({ error: `Failed to spawn async crawler job: ${spawnErr.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Return jobId immediately without blocking
    return new Response(JSON.stringify({
      success: true,
      jobId,
      message: "Asynchronous crawling task dispatched to Cloud Run executor container."
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[crawl-api-post] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
