import { MongoClient } from "mongodb";
import { GoogleAuth } from "google-auth-library";

export const dynamic = "force-dynamic";

export async function GET() {
  const defaultDbName = "fahem";
  const cloudRunUrl = (process.env.MONGODB_AGENT_URL || "").trim();

  // -------------------------------------------------------------
  // Path A: Route via Cloud Run Agent (Inside peered GCP VPC)
  // -------------------------------------------------------------
  if (cloudRunUrl) {
    try {
      console.log(`[db-metadata] Attempting to proxy DB metadata query through Cloud Run Agent: ${cloudRunUrl}...`);

      let oidcToken: string | null = null;
      let tokenSource: string = "";

      // 1. Try querying GCP Metadata Server (guaranteed to work inside App Hosting/Cloud Run)
      try {
        const metadataUrl = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(cloudRunUrl)}`;
        const metadataRes = await fetch(metadataUrl, {
          headers: { "Metadata-Flavor": "Google" }
        });
        if (metadataRes.ok) {
          const tokenText = await metadataRes.text();
          if (tokenText && tokenText.trim()) {
            oidcToken = tokenText.trim();
            tokenSource = "GCP Metadata Server";
          }
        }
      } catch (metadataErr) {
        // Ignore and try fallback
      }

      // 2. Try falling back to google-auth-library
      if (!oidcToken) {
        try {
          const auth = new GoogleAuth();
          const authClient = await auth.getIdTokenClient(cloudRunUrl);
          
          let headers = (await authClient.getRequestHeaders()) as any;
          let authHeader = headers["Authorization"] || headers["authorization"];
          
          if (!authHeader) {
            const headersWithArg = (await authClient.getRequestHeaders(cloudRunUrl)) as any;
            authHeader = headersWithArg["Authorization"] || headersWithArg["authorization"];
          }

          if (authHeader && authHeader.startsWith("Bearer ")) {
            oidcToken = authHeader.substring(7);
            tokenSource = "google-auth-library";
          }
        } catch (authErr: any) {
          console.warn(`[db-metadata] GCP ID token generation skipped: ${authErr.message}`);
        }
      }

      const requestHeaders: Record<string, string> = {
        "Accept": "application/json"
      };

      if (oidcToken) {
        requestHeaders["Authorization"] = `Bearer ${oidcToken}`;
        console.log(`[db-metadata] Secured OIDC ID token via ${tokenSource} for Agent communication.`);
      }

      const response = await fetch(`${cloudRunUrl}/db-metadata`, {
        method: "GET",
        headers: requestHeaders,
        signal: AbortSignal.timeout(8000) // 8 second timeout to fail fast and fall back if needed
      });

      if (response.ok) {
        const metadata = await response.json();
        console.log("[db-metadata] Successfully retrieved database metadata via Cloud Run Agent proxy!");
        return new Response(JSON.stringify(metadata), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } else {
        const errorText = await response.text();
        console.error(`[db-metadata] Cloud Run proxy returned HTTP ${response.status}: ${errorText}`);
      }
    } catch (err: any) {
      console.error(`[db-metadata] Failed to proxy via Cloud Run Agent: ${err.message}. Falling back to native connect.`);
    }
  }

  // -------------------------------------------------------------
  // Path B: Fallback / Native Connection (For local development)
  // -------------------------------------------------------------
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    return new Response(
      JSON.stringify({
        databaseName: defaultDbName,
        collectionsCount: "...",
        collectionList: "...",
        storageSize: "...",
        indexCount: "...",
        status: "Disconnected (Error: No active Agent URL or MONGODB_URI configured)"
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
    console.error("[db-metadata] Native connect error:", e);
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
        console.error("[db-metadata] Error closing native client:", closeError);
      }
    }
  }
}
