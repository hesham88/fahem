import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { StdioMcpClient } from "../mcp-client";

export const dynamic = "force-dynamic";

function sanitizeSchemaForGemini(schema: any): any {
  if (!schema) return undefined;
  const clean: any = {};
  if (schema.type) clean.type = schema.type;
  if (schema.description) clean.description = schema.description;
  if (schema.properties) {
    clean.properties = {};
    for (const [key, val] of Object.entries(schema.properties)) {
      clean.properties[key] = sanitizeSchemaForGemini(val);
    }
  }
  if (schema.required) clean.required = schema.required;
  if (schema.items) clean.items = sanitizeSchemaForGemini(schema.items);
  if (schema.enum) clean.enum = schema.enum;
  return clean;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const client = new StdioMcpClient();
        try {
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            controller.enqueue(encoder.encode("[ERROR] GEMINI_API_KEY is not configured.\n"));
            client.close();
            controller.close();
            return;
          }

          controller.enqueue(encoder.encode("[SYSTEM] Initiating MongoDB MCP agent execution stream...\n"));
          controller.enqueue(encoder.encode(`Prompt: ${prompt}\n\n`));

          // 1. Connect to MongoDB using the connect tool
          const mongodbUri = process.env.MONGODB_URI;
          if (!mongodbUri) {
            controller.enqueue(encoder.encode("[ERROR] MONGODB_URI is not configured.\n"));
            client.close();
            controller.close();
            return;
          }

          controller.enqueue(encoder.encode("[SYSTEM] Connecting to MongoDB instance via MCP connect tool...\n"));
          await client.callTool("connect", { connectionString: mongodbUri });
          controller.enqueue(encoder.encode("[SYSTEM] Connected successfully.\n"));

          // 2. Fetch all tools dynamically from the MCP server
          const toolsRes = await client.listTools();
          const tools = (toolsRes.tools || []).filter((t: any) => t.name !== "connect");

          const functionDeclarations = tools.map((t: any) => ({
            name: t.name,
            description: t.description,
            parameters: sanitizeSchemaForGemini(t.inputSchema)
          }));

          const ai = new GoogleGenAI({ apiKey });
          const modelName = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

          // Initial turn
          const contents: any[] = [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ];

          let loopCount = 0;
          const maxLoops = 10;
          let finalResponse = "";

          while (loopCount < maxLoops) {
            loopCount++;

            const response = await ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                systemInstruction: `
                  You are the Fahem MongoDB Database Agent.
                  You assist the user in inspecting database collections, examining schemas, running diagnostics, and executing queries.
                  You interact with the database ONLY through the official MongoDB MCP server tools.
                  Always ensure sensitive information such as server paths, raw IPs, and password fields are fully masked.
                `,
                tools: [{ functionDeclarations }]
              }
            });

            // Get model outputs
            const parts = response.candidates?.[0]?.content?.parts || [];
            
            // Log model output turns to history
            contents.push({
              role: "model",
              parts
            });

            // Print textual responses
            for (const part of parts) {
              if (part.text) {
                controller.enqueue(encoder.encode(part.text));
                finalResponse += part.text;
              }
            }

            // Execute any requested function calls
            const functionCalls = response.functionCalls || [];
            if (functionCalls.length === 0) {
              break;
            }

            const toolResponseParts: any[] = [];
            for (const call of functionCalls) {
              const name = call.name;
              if (!name) continue;
              const args = call.args;
              
              controller.enqueue(encoder.encode(`\n[SYSTEM] Tool Call: ${name}(${JSON.stringify(args)})\n`));
              
              try {
                // Call the MCP tool
                const toolResult = await client.callTool(name, args);
                
                // Mask sensitive info inside db-stats or explain results if they leak raw server stats
                if (name === "db-stats" || name === "dbStats") {
                  if (Array.isArray(toolResult.content)) {
                    for (const item of toolResult.content) {
                      if (item.type === "text" && item.text) {
                        const jsonStart = item.text.indexOf("{");
                        if (jsonStart !== -1) {
                          try {
                            const parsed = JSON.parse(item.text.substring(jsonStart));
                            if (parsed.raw) parsed.raw = "[MASKED_RAW_METADATA]";
                            item.text = item.text.substring(0, jsonStart) + JSON.stringify(parsed);
                          } catch(e) {}
                        }
                      }
                    }
                  }
                }

                controller.enqueue(encoder.encode(`[SYSTEM] Tool Response: Success\n`));
                toolResponseParts.push({
                  functionResponse: {
                    name,
                    response: toolResult
                  }
                });
              } catch (err: any) {
                controller.enqueue(encoder.encode(`[SYSTEM] Tool Response Error: ${err.message}\n`));
                toolResponseParts.push({
                  functionResponse: {
                    name,
                    response: { error: err.message }
                  }
                });
              }
            }

            // Push function responses to history
            contents.push({
              role: "tool",
              parts: toolResponseParts
            });
          }

          controller.enqueue(encoder.encode("\n=== Agent Final Output ===\n"));
          controller.enqueue(encoder.encode(finalResponse));
          controller.enqueue(encoder.encode("\n==========================\n"));
          controller.enqueue(encoder.encode("[CLOSE] Process exited with code 0\n"));
          
          client.close();
          controller.close();

        } catch (e: any) {
          controller.enqueue(encoder.encode(`\n[ERROR] Agent Loop Failure: ${e.message}\n`));
          client.close();
          controller.close();
        }
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
