import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { checkIsAdmin } from "../helper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Access Denied: Authentication context is missing." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Role-based Access Control Check using centralized helper
    const isAdmin = await checkIsAdmin(email);
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    return await proxyRequest("/admin/global-stats", "GET");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
