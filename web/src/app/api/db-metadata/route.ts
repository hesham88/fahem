import { NextRequest } from "next/server";
import { StdioMcpClient } from "../mcp-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return new Response(JSON.stringify({ error: "MONGODB_URI is not defined" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const client = new StdioMcpClient();
  try {
    const dbName = "fahem";
    
    // 1. Connect to MongoDB using the connect tool
    await client.callTool("connect", { connectionString: uri });

    // 2. Get Collections using list-collections
    const collectionsRes = await client.callTool("list-collections", { database: dbName });
    
    let collectionsList: string[] = [];
    if (collectionsRes && Array.isArray(collectionsRes.content)) {
      collectionsList = collectionsRes.content
        .map((item: any) => {
          if (item.type === "text" && item.text) {
            // Text is formatted as: "Name: users"
            const match = item.text.match(/^Name:\s*(.+)$/);
            return match ? match[1].trim() : item.text.replace("Name: ", "").trim();
          }
          return "";
        })
        .filter((name: string) => name !== "");
    }

    const collectionsCount = collectionsList.length;
    const collectionListStr = collectionsList.join(", ") || "None";

    // 3. Get Stats using db-stats
    const statsRes = await client.callTool("db-stats", { database: dbName });
    let dataSize = 0;
    let indexCount = 0;

    if (statsRes && Array.isArray(statsRes.content)) {
      const statsText = statsRes.content.find((item: any) => item.type === "text")?.text || "";
      const jsonStart = statsText.indexOf("{");
      if (jsonStart !== -1) {
        try {
          const statsJson = JSON.parse(statsText.substring(jsonStart));
          // statsJson storageSize/dataSize can have form: { "low": 4096, "high": 0, "unsigned": false } or simply number
          const getVal = (val: any) => {
            if (typeof val === "number") return val;
            if (val && typeof val.low === "number") return val.low;
            return 0;
          };
          dataSize = getVal(statsJson.totalSize || statsJson.dataSize || statsJson.storageSize);
          indexCount = getVal(statsJson.indexes);
        } catch (e) {
          // ignore
        }
      }
    }

    let storageSize = "0 B";
    if (dataSize > 1024 * 1024) {
      storageSize = `${(dataSize / (1024 * 1024)).toFixed(2)} MB`;
    } else if (dataSize > 1024) {
      storageSize = `${(dataSize / 1024).toFixed(2)} KB`;
    } else {
      storageSize = `${dataSize} B`;
    }

    return new Response(JSON.stringify({
      databaseName: dbName,
      collectionsCount: String(collectionsCount),
      collectionList: collectionListStr,
      storageSize,
      indexCount: String(indexCount),
      status: "Connected"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ 
      databaseName: "fahem",
      collectionsCount: "...",
      collectionList: "...",
      storageSize: "...",
      indexCount: "...",
      status: `Disconnected (Error: ${err.message})` 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  } finally {
    client.close();
  }
}
