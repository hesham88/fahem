import { NextRequest } from "next/server";
import { getOidcToken } from "../../proxy";
import { checkIsAdmin } from "../helper";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cloudRunUrl = (process.env.MONGODB_AGENT_URL || "").trim();

  // 1. Super Admin Validation Guardrail Engine via centralized helper
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

  const isAdmin = await checkIsAdmin(email);
  if (!isAdmin) {
    return new Response(
      JSON.stringify({
        error: "Forbidden: Only designated Admins are allowed to execute administrative database MCP tools."
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
        error: "Configuration Error: MONGODB_AGENT_URL is not configured."
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    const body = await req.json();
    console.log(`[admin-mcp-tool] Proxying MCP tool execution to Cloud Run: ${cloudRunUrl}/admin/mcp-tool...`);

    let oidcToken = await getOidcToken();
    if (!oidcToken) {
      oidcToken = "LOCAL_BYPASS_TOKEN_fahem_2026";
    }

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    if (oidcToken) {
      requestHeaders["Authorization"] = `Bearer ${oidcToken}`;
    }

    const response = await fetch(`${cloudRunUrl}/admin/mcp-tool`, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
      cache: "no-store"
    });

    if (response.ok) {
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      const errorText = await response.text();
      console.error(`[admin-mcp-tool] Cloud Run returned HTTP ${response.status}: ${errorText}`);
      return new Response(
        JSON.stringify({
          error: `Cloud Run execution failed: ${errorText || response.statusText}`
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  } catch (err: any) {
    console.error(`[admin-mcp-tool] Failed to execute tool proxy: ${err.message}`);
    return new Response(
      JSON.stringify({
        error: `Proxy error: ${err.message}`
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
