import { NextRequest } from "next/server";
import { proxyRequest } from "../proxy";
import { verifyAuth } from "../_auth";

export const dynamic = "force-dynamic";

// FC9.14: dedicated, email-keyed zatona history (stores the full result + presentation).
export async function GET(req: NextRequest) {
  try {
    const ctx = await verifyAuth(req);
    if (!ctx) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") || "200";
    const email = (ctx.email || "").trim().toLowerCase();
    if (!email) return new Response(JSON.stringify({ records: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    return await proxyRequest(`/user/zatona-history?userEmail=${encodeURIComponent(email)}&limit=${encodeURIComponent(limit)}`, "GET", undefined, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await verifyAuth(req);
    if (!ctx) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const record = await req.json();
    return await proxyRequest("/user/zatona-history", "POST", {
      userEmail: (ctx.email || "").trim().toLowerCase(),
      userId: ctx.uid,
      record,
    }, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
