import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, friendId, action } = body;

    if (!userId || !friendId || !action) {
      return new Response(JSON.stringify({ error: "userId, friendId, and action are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/user/friend", "POST", { userId, friendId, action });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
