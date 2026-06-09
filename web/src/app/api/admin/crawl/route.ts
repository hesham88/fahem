import { NextRequest } from "next/server";
import { isLocalEnv, getLocalDb, saveLocalDb, resolveScriptPath, getDbTarget } from "../../localDbHelper";
import { spawn } from "child_process";
import path from "path";
import { proxyRequest } from "../../proxy";
import { requireAdmin } from "../../_auth";

export const dynamic = "force-dynamic";

// GET handler to poll the status, progress, logs and discovered items of a crawl job
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      // Fetch from local environment fallback
      if (isLocalEnv()) {
        const db = getLocalDb() as any;
        const crawlJobs = db.crawl_jobs || [];
        const sortedJobs = [...crawlJobs].sort((a: any, b: any) => (b.created_at || 0) - (a.created_at || 0));
        return new Response(JSON.stringify({
          success: true,
          jobs: sortedJobs
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Fetch from Cloud Run Agent in Production
      return await proxyRequest("/admin/crawl", "GET", undefined, ctx);
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

      // Check if process has died if still harvesting
      if (job.status === "harvesting") {
        let isAlive = false;
        if (job.active_pid) {
          try {
            process.kill(job.active_pid, 0);
            isAlive = true;
          } catch (e) {}
        }
        
        const ageInSeconds = (Date.now() / 1000) - (job.created_at || job.updated_at || 0);
        let shouldMarkFailed = false;
        if (!isAlive) {
          if (job.active_pid) {
            // Process was active but is no longer running (exited)
            shouldMarkFailed = true;
          } else if (ageInSeconds > 60) {
            // No PID written and more than 60 seconds have passed
            shouldMarkFailed = true;
          }
        }
        
        if (shouldMarkFailed) {
          job.status = "failed";
          if (!job.logs) job.logs = [];
          job.logs.push(job.active_pid
            ? `[SYSTEM] Background crawler process (PID ${job.active_pid}) exited or was terminated unexpectedly.`
            : `[SYSTEM] Background crawler process failed to initialize or was terminated unexpectedly.`
          );
          job.updated_at = Date.now() / 1000;
          saveLocalDb(db);
        }
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

    // 2. Fetch from Cloud Run Agent in Production
    return await proxyRequest(`/admin/crawl?jobId=${jobId}`, "GET", undefined, ctx);

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
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const { url, maxDepth = 3, jobId, action } = body;

    const requesterEmail = ctx.email || "";

    // 1. Cooperative/force crawl job controls (pause/resume/stop/kill)
    if (jobId && action) {
      if (!isLocalEnv()) {
        return await proxyRequest("/admin/crawl", "POST", { jobId, action, requesterEmail }, ctx);
      }

      const db = getLocalDb() as any;
      const crawlJobs = db.crawl_jobs || [];
      const job = crawlJobs.find((j: any) => j._id === jobId);

      if (!job) {
        return new Response(JSON.stringify({ error: "Crawl job not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      const timestamp = new Date().toLocaleTimeString();

      if (action === "pause") {
        job.status = "paused";
        if (!job.logs) job.logs = [];
        job.logs.push(`[${timestamp}] [CONTROL] ⏸️ Ingestion crawl paused cooperatively.`);
        job.updated_at = Date.now() / 1000;
        saveLocalDb(db);
        return new Response(JSON.stringify({ success: true, message: "Crawl job paused." }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (action === "resume") {
        job.status = "harvesting";
        if (!job.logs) job.logs = [];
        job.logs.push(`[${timestamp}] [CONTROL] ▶️ Ingestion crawl resumed.`);
        job.updated_at = Date.now() / 1000;
        saveLocalDb(db);
        return new Response(JSON.stringify({ success: true, message: "Crawl job resumed." }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (action === "kill" || action === "stop") {
        let processKilled = false;
        if (job.active_pid) {
          try {
            process.kill(job.active_pid, "SIGKILL");
            processKilled = true;
          } catch (killErr: any) {
            console.error(`[Crawl Job Control] Failed to kill process ${job.active_pid}: ${killErr.message}`);
          }
        }
        job.status = action === "kill" ? "killed" : "failed";
        if (!job.logs) job.logs = [];
        job.logs.push(`[${timestamp}] [CONTROL] 🛑 Ingestion crawl manually ${action === "kill" ? "force-killed" : "stopped"}.`);
        job.updated_at = Date.now() / 1000;
        saveLocalDb(db);
        return new Response(JSON.stringify({
          success: true,
          message: processKilled ? "Crawl process terminated." : "Crawl job status updated."
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ error: `Unrecognized action: ${action}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!url) {
      return new Response(JSON.stringify({ error: "Missing crawl URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const requesterEmail = ctx.email || "";

    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    // 2. Production routing via secure Cloud Run proxy helper
    if (!isLocalEnv()) {
      return await proxyRequest("/admin/crawl", "POST", { url: targetUrl, maxDepth, requesterEmail }, ctx);
    }

    // Generate a unique jobId
    const jobId = `crawl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Prepare initial log window state
    const initialLogs = [
      `[INIT] 🚀 Spawning isolated GCP Cloud Run Harvester container...`,
      `[INIT] 🌐 Target domain: ${targetUrl}`,
      `[INIT] ⚙️ Parameters: Deep Recursive Search (No Depth Caps)`,
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

    // Spawn Python crawling job completely asynchronously
    try {
      const pythonPath = "python";
      const scriptPath = resolveScriptPath("async_crawler.py");

      const payload = {
        jobId,
        url: targetUrl,
        maxDepth,
        requesterEmail
      };

      const env = {
        ...process.env,
        RESOLVED_MONGODB_URI: process.env["MONGODB_URI"] || "mongodb://localhost:27017"
      };

      const child = spawn(pythonPath, [scriptPath], { env });
      const pid = child.pid;

      if (pid) {
        // Update local DB with active_pid immediately to prevent premature fail status in polling
        if (isLocalEnv()) {
          const db = getLocalDb() as any;
          if (db.crawl_jobs) {
            const job = db.crawl_jobs.find((j: any) => j._id === jobId);
            if (job) {
              job.active_pid = pid;
              job.updated_at = Date.now() / 1000;
              saveLocalDb(db);
            }
          }
        }
      }

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
