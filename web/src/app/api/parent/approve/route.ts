import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { parentEmail, childId } = body;

    if (!parentEmail || !childId) {
      return new Response(JSON.stringify({ error: "parentEmail and childId are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/parent/approve", "POST", { parentEmail, childId });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
