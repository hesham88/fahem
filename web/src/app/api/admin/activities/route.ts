import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";

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

    // Role-based Access Control Check
    const HARDCODED_ADMINS = ["hesham1988@gmail.com", "contact@asdaa.co"];
    const envAdmins = process.env.SUPERADMIN_USER
      ? process.env.SUPERADMIN_USER.split(",").map((addr) => addr.trim().toLowerCase())
      : [];
    const admins = Array.from(new Set([...HARDCODED_ADMINS, ...envAdmins]));
    
    if (!admins.includes(email.toLowerCase().trim())) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Superadmin access required." }),
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
