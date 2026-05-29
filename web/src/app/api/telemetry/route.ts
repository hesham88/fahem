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

    return await proxyRequest(`/user/token-stats?userId=${encodeURIComponent(userId)}`, "GET");
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
    const { userId, userEmail, promptTokens, completionTokens, totalTokens, model, type } = body;

    if (!userId || !userEmail) {
      return new Response(JSON.stringify({ error: "userId and userEmail are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/user/token-usage", "POST", {
      userId,
      userEmail,
      promptTokens,
      completionTokens,
      totalTokens,
      model,
      type
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
