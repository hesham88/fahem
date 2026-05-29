import { NextRequest } from "next/server";
import { proxyRequest } from "../proxy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest(`/user/activity?userId=${encodeURIComponent(userId)}`, "GET");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userEmail, action, status, details } = body;

    if (!userId || !userEmail || !action || !status) {
      return new Response(JSON.stringify({ error: "userId, userEmail, action, and status are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/user/activity", "POST", {
      userId,
      userEmail,
      action,
      status,
      details
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
