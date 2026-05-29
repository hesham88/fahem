import { NextRequest } from "next/server";
import { GoogleAuth } from "google-auth-library";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const defaultDbName = "fahem";
  const cloudRunUrl = (process.env.MONGODB_AGENT_URL || "").trim();

  // 1. Super Admin Validation Guardrail Engine
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return new Response(
      JSON.stringify({
        error: "Access Denied: Authentication context is missing. Please sign in."
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  const superadminConfig = process.env.SUPERADMIN_USER;
  if (!superadminConfig) {
    return new Response(
      JSON.stringify({
        error: "Server Error: Super Admin security policy is not configured on this server."
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  const admins = superadminConfig.split(",").map((addr) => addr.trim().toLowerCase());
  if (!admins.includes(email.toLowerCase().trim())) {
    return new Response(
      JSON.stringify({
        error: "Forbidden: Only designated Super Admins are allowed to inspect database configurations and metadata."
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  // 2. Strict Agent-Only Connection (Proxy to Cloud Run inside VPC)
  if (!cloudRunUrl) {
    return new Response(
      JSON.stringify({
        databaseName: defaultDbName,
        collectionsCount: "...",
        collectionList: "...",
        storageSize: "...",
        indexCount: "...",
        status: "Disconnected (Error: MONGODB_AGENT_URL is not configured)"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    console.log(`[db-metadata] Attempting to proxy DB metadata query through Cloud Run Agent: ${cloudRunUrl}...`);

    let oidcToken: string | null = null;
    let tokenSource: string = "";

    // A. Query GCP Metadata Server (guaranteed inside App Hosting / Cloud Run)
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
      // Silently skip
    }

    // B. Fallback to google-auth-library (for local/testing environments with service accounts)
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
      signal: AbortSignal.timeout(8000)
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
      return new Response(
        JSON.stringify({
          databaseName: defaultDbName,
          collectionsCount: "...",
          collectionList: "...",
          storageSize: "...",
          indexCount: "...",
          status: `Disconnected (Cloud Run returned HTTP ${response.status})`
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  } catch (err: any) {
    console.error(`[db-metadata] Failed to proxy via Cloud Run Agent: ${err.message}`);
    return new Response(
      JSON.stringify({
        databaseName: defaultDbName,
        collectionsCount: "...",
        collectionList: "...",
        storageSize: "...",
        indexCount: "...",
        status: `Disconnected (Proxy error: ${err.message})`
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
