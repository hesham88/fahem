import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { requireAdmin } from "../../_auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cloudRunUrl = (process.env.MONGODB_AGENT_URL || "").trim();

  // 1. Authenticate and enforce Admin role via token check (fail closed)
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) {
    return ctx;
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
    console.log(`[admin-mcp-tool] Proxying MCP tool execution to Cloud Run on behalf of ${ctx.email}: ${cloudRunUrl}/admin/mcp-tool...`);

    return await proxyRequest("/admin/mcp-tool", "POST", body, ctx);
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
