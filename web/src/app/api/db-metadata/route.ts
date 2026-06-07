import { NextRequest } from "next/server";
import { getOidcToken } from "../proxy";
import { requireAdmin } from "../_auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const defaultDbName = "fahem";
  const cloudRunUrl = (process.env.MONGODB_AGENT_URL || "").trim();

  // 1. Super Admin Validation Guardrail Engine via centralized requireAdmin helper
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;

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

    let oidcToken = await getOidcToken();

    const requestHeaders: Record<string, string> = {
      "Accept": "application/json",
      "X-Verified-Principal": JSON.stringify({
        uid: ctx.uid,
        email: ctx.email,
        role: ctx.role,
        db_target: ctx.db_target || "fahem"
      })
    };

    if (oidcToken) {
      requestHeaders["Authorization"] = `Bearer ${oidcToken}`;
      console.log(`[db-metadata] Secured OIDC ID token for Agent communication.`);
    }

    const response = await fetch(`${cloudRunUrl}/db-metadata`, {
      method: "GET",
      headers: requestHeaders,
      signal: AbortSignal.timeout(8000),
      cache: "no-store"
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
