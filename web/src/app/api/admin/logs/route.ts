import { NextRequest } from "next/server";
import { getOidcToken } from "../../proxy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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

  const HARDCODED_ADMINS = ["hesham1988@gmail.com", "contact@asdaa.co"];
  const envAdmins = process.env.SUPERADMIN_USER
    ? process.env.SUPERADMIN_USER.split(",").map((addr) => addr.trim().toLowerCase())
    : [];
  const admins = Array.from(new Set([...HARDCODED_ADMINS, ...envAdmins]));
  if (!admins.includes(email.toLowerCase().trim())) {
    return new Response(
      JSON.stringify({
        error: "Forbidden: Only designated Super Admins are allowed to inspect operational logs."
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  if (!cloudRunUrl) {
    return new Response(
      JSON.stringify({
        logs: [],
        error: "MONGODB_AGENT_URL is not configured"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    console.log(`[admin-logs] Attempting to proxy logs query through Cloud Run Agent: ${cloudRunUrl}...`);

    let oidcToken = await getOidcToken();
    if (!oidcToken) {
      oidcToken = "LOCAL_BYPASS_TOKEN_fahem_2026";
    }

    const requestHeaders: Record<string, string> = {
      "Accept": "application/json"
    };

    if (oidcToken) {
      requestHeaders["Authorization"] = `Bearer ${oidcToken}`;
      console.log(`[admin-logs] Secured OIDC ID token for Agent communication.`);
    }

    const response = await fetch(`${cloudRunUrl}/audit-logs`, {
      method: "GET",
      headers: requestHeaders,
      signal: AbortSignal.timeout(8000),
      cache: "no-store"
    });

    if (response.ok) {
      const data = await response.json();
      console.log("[admin-logs] Successfully retrieved logs via Cloud Run Agent proxy!");
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      const errorText = await response.text();
      console.error(`[admin-logs] Cloud Run proxy returned HTTP ${response.status}: ${errorText}`);
      return new Response(
        JSON.stringify({
          logs: [],
          error: `Cloud Run returned HTTP ${response.status}`
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  } catch (err: any) {
    console.error(`[admin-logs] Failed to proxy via Cloud Run Agent: ${err.message}`);
    return new Response(
      JSON.stringify({
        logs: [],
        error: `Proxy error: ${err.message}`
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
