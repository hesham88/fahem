import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { MongoClient } from "mongodb";
import dns from "dns";

// Ensure DNS SRV queries resolve correctly in production and local environments
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
  dns.setDefaultResultOrder("ipv4first");
} catch (e) {
  console.warn("Failed to set DNS servers:", e);
}

export const dynamic = "force-dynamic";

// Helper database tools executed dynamically via the agentic tool-calling loop
async function handleToolCall(name: string, args: any): Promise<any> {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const dbName = args.databaseName || "fahem";

    if (name === "list_databases") {
      const result = await client.db().admin().listDatabases();
      return result;
    } else if (name === "list_database_collections") {
      const collections = await client.db(dbName).listCollections().toArray();
      return { collections: collections.map((c) => c.name) };
    } else if (name === "get_database_stats") {
      const stats = await client.db(dbName).command({ dbStats: 1 });
      if (stats.raw) {
        stats.raw = "[MASKED_RAW_METADATA]";
      }
      return stats;
    } else if (name === "get_collection_schema") {
      const colName = args.collectionName;
      if (!colName) throw new Error("Collection name must be provided");
      const sample = await client.db(dbName).collection(colName).find().limit(10).toArray();
      if (sample.length === 0) {
        return { message: "Collection is empty." };
      }
      const schema: any = {};
      for (const doc of sample) {
        for (const [key, val] of Object.entries(doc)) {
          const type = typeof val;
          if (!schema[key]) {
            schema[key] = { type, occurrences: 1 };
          } else {
            schema[key].occurrences += 1;
          }
        }
      }
      return { schema };
    } else if (name === "find_documents") {
      const colName = args.collectionName;
      if (!colName) throw new Error("Collection name must be provided");
      const filter = args.filter ? JSON.parse(args.filter) : {};
      const projection = args.projection ? JSON.parse(args.projection) : {};
      const limit = args.limit || 10;
      const skip = args.skip || 0;
      const docs = await client.db(dbName).collection(colName).find(filter, { projection }).skip(skip).limit(limit).toArray();
      return docs;
    } else if (name === "aggregate_documents") {
      const colName = args.collectionName;
      if (!colName) throw new Error("Collection name must be provided");
      const pipeline = JSON.parse(args.pipeline);
      const docs = await client.db(dbName).collection(colName).aggregate(pipeline).toArray();
      return docs;
    } else if (name === "count_documents") {
      const colName = args.collectionName;
      if (!colName) throw new Error("Collection name must be provided");
      const filter = args.filter ? JSON.parse(args.filter) : {};
      const count = await client.db(dbName).collection(colName).countDocuments(filter);
      return { count };
    } else {
      throw new Error(`Unknown function: ${name}`);
    }
  } finally {
    await client.close();
  }
}

// Function Declarations exposed to the Gemini Model for Tool Use
const functionDeclarations: any[] = [
  {
    name: "list_databases",
    description: "Discovers all available databases and lists their basic metrics.",
    parameters: {
      type: "OBJECT",
      properties: {},
    }
  },
  {
    name: "list_database_collections",
    description: "Lists all collections in a given database.",
    parameters: {
      type: "OBJECT",
      properties: {
        databaseName: { type: "STRING", description: "The name of the database" }
      },
      required: ["databaseName"]
    }
  },
  {
    name: "get_database_stats",
    description: "Retrieves storage size, index counts, and document stats for a database.",
    parameters: {
      type: "OBJECT",
      properties: {
        databaseName: { type: "STRING", description: "The name of the database" }
      },
      required: ["databaseName"]
    }
  },
  {
    name: "get_collection_schema",
    description: "Samples documents from a collection to derive its schema.",
    parameters: {
      type: "OBJECT",
      properties: {
        databaseName: { type: "STRING", description: "The name of the database" },
        collectionName: { type: "STRING", description: "The name of the collection" }
      },
      required: ["databaseName", "collectionName"]
    }
  },
  {
    name: "find_documents",
    description: "Finds documents matching a query filter from a collection.",
    parameters: {
      type: "OBJECT",
      properties: {
        databaseName: { type: "STRING", description: "The name of the database" },
        collectionName: { type: "STRING", description: "The name of the collection" },
        filter: { type: "STRING", description: "JSON string representing the query filter (e.g. '{\"name\": \"Alice\"}')" },
        projection: { type: "STRING", description: "JSON string representing projection fields (e.g. '{\"email\": 1}')" },
        limit: { type: "NUMBER", description: "Maximum number of documents to return" },
        skip: { type: "NUMBER", description: "Number of documents to skip" }
      },
      required: ["databaseName", "collectionName"]
    }
  },
  {
    name: "aggregate_documents",
    description: "Runs an aggregation pipeline on a collection.",
    parameters: {
      type: "OBJECT",
      properties: {
        databaseName: { type: "STRING", description: "The name of the database" },
        collectionName: { type: "STRING", description: "The name of the collection" },
        pipeline: { type: "STRING", description: "JSON string representing the aggregation pipeline array (e.g. '[{\"$match\": {\"active\": true}}]')" }
      },
      required: ["databaseName", "collectionName", "pipeline"]
    }
  },
  {
    name: "count_documents",
    description: "Counts documents matching a filter in a collection.",
    parameters: {
      type: "OBJECT",
      properties: {
        databaseName: { type: "STRING", description: "The name of the database" },
        collectionName: { type: "STRING", description: "The name of the collection" },
        filter: { type: "STRING", description: "JSON string representing the filter query" }
      },
      required: ["databaseName", "collectionName"]
    }
  }
];

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
        try {
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            controller.enqueue(encoder.encode("[ERROR] GEMINI_API_KEY is not configured.\n"));
            controller.close();
            return;
          }

          controller.enqueue(encoder.encode("[SYSTEM] Initiating native Node-based agent execution stream...\n"));
          controller.enqueue(encoder.encode(`Prompt: ${prompt}\n\n`));

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
                  You have direct access to list databases, list collections, get stats, analyze schemas, count documents, find records, and aggregate collections.
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
              parts: parts.map((p: any) => {
                const pObj: any = {};
                if (p.text) pObj.text = p.text;
                if (p.functionCall) pObj.functionCall = p.functionCall;
                return pObj;
              })
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
                const toolResult = await handleToolCall(name, args);
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
          controller.close();

        } catch (e: any) {
          controller.enqueue(encoder.encode(`\n[ERROR] Agent Loop Failure: ${e.message}\n`));
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
