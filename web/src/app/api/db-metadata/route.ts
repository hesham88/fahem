import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Dynamic parent/child traversal to locate agents/get_metadata.py dynamically in production standalone container
    function findScriptPath(startDir: string): { scriptPath: string; rootDir: string } | null {
      // 1. Walk up parent directories
      let current = startDir;
      while (true) {
        let potential = path.join(current, "agents/get_metadata.py");
        if (fs.existsSync(potential)) {
          return { scriptPath: potential, rootDir: current };
        }
        potential = path.join(current, "web/agents/get_metadata.py");
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
            const potential = path.join(dir, "agents/get_metadata.py");
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

    let pythonCmd = "python";
    if (process.platform !== "win32") {
      pythonCmd = "python3";
    }

    const result = await new Promise<string>((resolve, reject) => {
      const child = spawn(pythonCmd, [scriptPath], {
        cwd: rootDir,
        env: process.env
      });

      let stdoutData = "";
      let stderrData = "";

      child.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      child.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Exit code ${code}: ${stderrData}`));
        } else {
          resolve(stdoutData);
        }
      });

      child.on("error", (err) => {
        // Fallback retry
        const alternativeCmd = pythonCmd === "python" ? "python3" : "python";
        try {
          const retryChild = spawn(alternativeCmd, [scriptPath], {
            cwd: rootDir,
            env: process.env
          });

          let retryStdout = "";
          let retryStderr = "";

          retryChild.stdout.on("data", (data) => {
            retryStdout += data.toString();
          });

          retryChild.stderr.on("data", (data) => {
            retryStderr += data.toString();
          });

          retryChild.on("close", (code) => {
            if (code !== 0) {
              reject(new Error(`Fallback exit code ${code}: ${retryStderr}`));
            } else {
              resolve(retryStdout);
            }
          });

          retryChild.on("error", (retryErr) => {
            reject(new Error(`Failed to start fallback process: ${retryErr.message}`));
          });
        } catch (e: any) {
          reject(new Error(`Failed to start fallback: ${e.message}`));
        }
      });
    });

    const parsedData = JSON.parse(result.trim());
    return new Response(JSON.stringify(parsedData), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
