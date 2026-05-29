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

    // Dynamic parent/child traversal to locate agents/main.py dynamically in production standalone container
    function findScriptPath(startDir: string): { scriptPath: string; rootDir: string } | null {
      // 1. Walk up parent directories
      let current = startDir;
      while (true) {
        let potential = path.join(current, "agents/main.py");
        if (fs.existsSync(potential)) {
          return { scriptPath: potential, rootDir: current };
        }
        potential = path.join(current, "web/agents/main.py");
        if (fs.existsSync(potential)) {
          return { scriptPath: potential, rootDir: path.join(current, "web") };
        }
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
      }

      // 2. Scan child directories recursively
      function searchDown(dir: string, depth: number): { scriptPath: string; rootDir: string } | null {
        if (depth > 5) return null;
        try {
          const files = fs.readdirSync(dir);
          if (files.includes("agents")) {
            const potential = path.join(dir, "agents/main.py");
            if (fs.existsSync(potential)) {
              return { scriptPath: potential, rootDir: dir };
            }
          }
          for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory() && file !== "node_modules" && file !== ".next" && !file.startsWith(".")) {
              const res = searchDown(fullPath, depth + 1);
              if (res) return res;
            }
          }
        } catch (e) {
          // ignore
        }
        return null;
      }

      return searchDown(startDir, 0);
    }

    const startDir = process.cwd();
    const scriptInfo = findScriptPath(startDir);

    if (!scriptInfo) {
      return new Response(JSON.stringify({ 
        error: `Script not found starting from ${startDir}. Directory contents: ${JSON.stringify(fs.existsSync(startDir) ? fs.readdirSync(startDir) : [])}` 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { scriptPath, rootDir } = scriptInfo;

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
