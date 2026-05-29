import { MongoClient } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  const defaultDbName = "fahem";
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    return new Response(
      JSON.stringify({
        databaseName: defaultDbName,
        collectionsCount: "...",
        collectionList: "...",
        storageSize: "...",
        indexCount: "...",
        status: "Disconnected (Error: MONGODB_URI env var is not set)"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  let client: MongoClient | null = null;

  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();

    // Determine the database name from connection string or default
    let dbName = defaultDbName;
    try {
      const dbInstance = client.db();
      if (dbInstance.databaseName && dbInstance.databaseName !== "test") {
        dbName = dbInstance.databaseName;
      }
    } catch (e) {
      // ignore
    }

    const db = client.db(dbName);

    // 1. Get Collections and Names
    const collectionsInfo = await db.listCollections().toArray();
    const collections = collectionsInfo.map(col => col.name);
    const collectionsCount = collections.length;
    const collectionList = collections.length > 0 ? collections.join(", ") : "None";

    // 2. Get Stats & Size
    const stats = await db.command({ dbStats: 1 });
    const dataSize = stats.totalSize ?? stats.dataSize ?? stats.storageSize ?? 0;
    const indexCount = stats.indexes ?? 0;

    // Human readable size
    let storageSizeStr = "";
    if (dataSize > 1024 * 1024) {
      storageSizeStr = `${(dataSize / (1024 * 1024)).toFixed(2)} MB`;
    } else if (dataSize > 1024) {
      storageSizeStr = `${(dataSize / 1024).toFixed(2)} KB`;
    } else {
      storageSizeStr = `${dataSize} B`;
    }

    const metadata = {
      databaseName: dbName,
      collectionsCount: String(collectionsCount),
      collectionList: collectionList,
      storageSize: storageSizeStr,
      indexCount: String(indexCount),
      status: "Connected"
    };

    return new Response(JSON.stringify(metadata), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: unknown) {
    const e = err as Error;
    console.error("[db-metadata] Error fetching database metadata natively:", e);
    return new Response(
      JSON.stringify({
        databaseName: defaultDbName,
        collectionsCount: "...",
        collectionList: "...",
        storageSize: "...",
        indexCount: "...",
        status: `Disconnected (Error: ${e.message})`
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  } finally {
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.error("[db-metadata] Error closing mongo client:", closeError);
      }
    }
  }
}

