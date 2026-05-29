import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Determine the absolute path to agents/get_metadata.py
    const path1 = path.join(process.cwd(), "agents/get_metadata.py");
    const path2 = path.join(process.cwd(), "web/agents/get_metadata.py");
    const path3 = path.join(process.cwd(), ".next/standalone/web/agents/get_metadata.py");
    const path4 = path.join(process.cwd(), "standalone/web/agents/get_metadata.py");
    const path5 = path.join(process.cwd(), "../agents/get_metadata.py");

    let scriptPath = "";
    let rootDir = process.cwd();

    if (fs.existsSync(path1)) {
      scriptPath = path1;
      rootDir = process.cwd();
    } else if (fs.existsSync(path2)) {
      scriptPath = path2;
      rootDir = path.join(process.cwd(), "web");
    } else if (fs.existsSync(path3)) {
      scriptPath = path3;
      rootDir = path.join(process.cwd(), ".next/standalone/web");
    } else if (fs.existsSync(path4)) {
      scriptPath = path4;
      rootDir = path.join(process.cwd(), "standalone/web");
    } else if (fs.existsSync(path5)) {
      scriptPath = path5;
      rootDir = path.join(process.cwd(), "..");
    } else {
      return new Response(JSON.stringify({ 
        error: `Script not found. Paths checked: ${JSON.stringify([path1, path2, path3, path4, path5])}` 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

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
