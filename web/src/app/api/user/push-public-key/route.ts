import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { verifyAuth } from "../../_auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ctx = await verifyAuth(req);
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return await proxyRequest("/user/push-public-key", "GET", undefined, ctx);
}
