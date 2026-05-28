import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Determine the absolute path to agents/main.py
    const localPath = path.join(process.cwd(), "agents/main.py");
    const parentPath = path.join(process.cwd(), "../agents/main.py");
    
    let scriptPath = localPath;
    let rootDir = process.cwd();
    
    if (fs.existsSync(localPath)) {
      scriptPath = localPath;
      rootDir = process.cwd();
    } else if (fs.existsSync(parentPath)) {
      scriptPath = parentPath;
      rootDir = path.join(process.cwd(), "..");
    } else {
      // Standalone build folder resolution fallback
      const standalonePath = path.join(process.cwd(), ".next/standalone/agents/main.py");
      if (fs.existsSync(standalonePath)) {
        scriptPath = standalonePath;
        rootDir = path.join(process.cwd(), ".next/standalone");
      } else {
        return new Response(JSON.stringify({ error: `Script not found at any expected path (local: ${localPath}, parent: ${parentPath})` }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        let pythonCmd = "python";
        if (process.platform !== "win32") {
          pythonCmd = "python3";
        }
        
        // Spawn the Python process
        const child = spawn(pythonCmd, [scriptPath, prompt], {
          cwd: rootDir,
          env: {
            ...process.env,
            // Inherit parent environment variables (loaded via .env.local on server-start/dev)
          }
        });

        child.stdout.on("data", (data) => {
          controller.enqueue(encoder.encode(data.toString()));
        });

        child.stderr.on("data", (data) => {
          controller.enqueue(encoder.encode(`[STDERR] ${data.toString()}`));
        });

        child.on("close", (code) => {
          controller.enqueue(encoder.encode(`[CLOSE] Process exited with code ${code}\n`));
          controller.close();
        });

        child.on("error", (err) => {
          // Fallback command attempt
          const alternativeCmd = pythonCmd === "python" ? "python3" : "python";
          try {
            const retryChild = spawn(alternativeCmd, [scriptPath, prompt], {
              cwd: rootDir,
              env: process.env
            });

            retryChild.stdout.on("data", (data) => {
              controller.enqueue(encoder.encode(data.toString()));
            });

            retryChild.stderr.on("data", (data) => {
              controller.enqueue(encoder.encode(`[STDERR] ${data.toString()}`));
            });

            retryChild.on("close", (code) => {
              controller.enqueue(encoder.encode(`[CLOSE] Process exited with code ${code}\n`));
              controller.close();
            });

            retryChild.on("error", (retryErr) => {
              controller.enqueue(encoder.encode(`Error executing agent subprocess: ${err.message}. Fallback error: ${retryErr.message}\n`));
              controller.close();
            });
          } catch (e: any) {
            controller.enqueue(encoder.encode(`Error executing agent: ${err.message}. Fallback exception: ${e.message}\n`));
            controller.close();
          }
        });
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache, no-transform"
      }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
