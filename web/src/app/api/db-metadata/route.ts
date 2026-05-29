import { NextRequest } from "next/server";
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

export async function GET(req: NextRequest) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return new Response(JSON.stringify({ error: "MONGODB_URI is not defined" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const dbName = "fahem"; // Target database name
    
    // 1. Get Collections
    const collections = await client.db(dbName).listCollections().toArray();
    const collectionsCount = collections.length;
    const collectionList = collections.map(c => c.name).join(", ") || "None";

    // 2. Get Stats
    const stats = await client.db(dbName).command({ dbStats: 1 });
    const dataSize = stats.dataSize || 0;
    const indexCount = stats.indexes || 0;

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
      collectionList,
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
    await client.close();
  }
}
