import { NextRequest } from "next/server";
import { checkIsAdmin } from "../helper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    
    if (!email) {
      return new Response(JSON.stringify({ isAdmin: false, error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Superadmin check (Gated purely via environment secrets)
    let raw = process.env.SUPERADMIN_USER || "";
    // Strip outer quotes if any (common in Secret Manager values)
    raw = raw.trim().replace(/^['"]|['"]$/g, "");
    const envSuperadmins = raw
      ? raw.split(",").map((addr) => addr.trim().toLowerCase().replace(/^['"]|['"]$/g, ""))
      : [];
    const isSuperadmin = envSuperadmins.includes(normalizedEmail);

    // 2. Comprehensive Admin Check (Superadmin OR MongoDB approved standard admin)
    const isAdmin = await checkIsAdmin(normalizedEmail);

    return new Response(JSON.stringify({ isAdmin, isSuperadmin }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (e: any) {
    console.error("[admin-check] Error validating admin status:", e);
    return new Response(JSON.stringify({ isAdmin: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
