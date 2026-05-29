import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const username = searchParams.get("username");

    if (!userId && !username) {
      return new Response(JSON.stringify({ error: "userId or username is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const query = userId 
      ? `userId=${encodeURIComponent(userId)}` 
      : `username=${encodeURIComponent(username || "")}`;

    return await proxyRequest(`/user/profile?${query}`, "GET");
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
    const { userId, profile } = body;

    if (!userId || !profile) {
      return new Response(JSON.stringify({ error: "userId and profile are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/user/profile", "POST", { userId, profile });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
