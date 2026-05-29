import { NextRequest } from "next/server";

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

    const HARDCODED_ADMINS = ["hesham1988@gmail.com", "contact@asdaa.co"];
    const envAdmins = process.env.SUPERADMIN_USER
      ? process.env.SUPERADMIN_USER.split(",").map((addr) => addr.trim().toLowerCase())
      : [];
    const admins = Array.from(new Set([...HARDCODED_ADMINS, ...envAdmins]));
    const isAdmin = admins.includes(email.toLowerCase().trim());

    return new Response(JSON.stringify({ isAdmin }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ isAdmin: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
