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

    const superadmin = process.env.SUPERADMIN_USER;
    
    if (!superadmin) {
      return new Response(JSON.stringify({ isAdmin: false, warning: "SUPERADMIN_USER is not configured on server" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const isAdmin = email.toLowerCase().trim() === superadmin.toLowerCase().trim();

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
