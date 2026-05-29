import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

function getLanguageName(lang: string): string {
  const mapping: { [key: string]: string } = {
    en: "English",
    ar: "Arabic",
    fr: "French",
    de: "German",
    es: "Spanish",
    it: "Italian",
    zh: "Chinese"
  };
  return mapping[lang] || "English";
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, language, userEmail, userId } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const agentScriptPath = path.resolve(process.cwd(), "agents/main.py");
        
        // Formulate language hint and prepend/append to the prompt
        const langName = getLanguageName(language || "en");
        const enhancedPrompt = `[Please respond in ${langName}] ${prompt}`;

        controller.enqueue(encoder.encode("[SYSTEM] Initiating Python-based ADK Agent with MongoDB MCP server...\n"));
        controller.enqueue(encoder.encode(`Prompt: ${prompt} (Language: ${langName})\n\n`));

        // Spawn python web/agents/main.py [enhancedPrompt]
        const pythonProcess = spawn("python", [agentScriptPath, enhancedPrompt], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            LANGUAGE: language || "en",
            USER_EMAIL: userEmail || "",
            USER_ID: userId || ""
          }
        });

        pythonProcess.stdout.on("data", (chunk: Buffer) => {
          controller.enqueue(chunk);
        });

        pythonProcess.stderr.on("data", (chunk: Buffer) => {
          // Log stderr to Node.js console, but don't clutter main agent output in UI
          const errStr = chunk.toString();
          if (errStr.includes("UserWarning") || errStr.includes("Loading local configuration")) {
            // Quiet down normal experimental warnings / configuration logs
            return;
          }
          controller.enqueue(encoder.encode(`[SYSTEM LOG] ${errStr}`));
        });

        pythonProcess.on("close", (code) => {
          controller.enqueue(encoder.encode(`\n[CLOSE] Process exited with code ${code}\n`));
          controller.close();
        });

        pythonProcess.on("error", (err) => {
          controller.enqueue(encoder.encode(`\n[ERROR] Spawning python process failed: ${err.message}\n`));
          controller.close();
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

  } catch (e: unknown) {
    const err = e as Error;
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
