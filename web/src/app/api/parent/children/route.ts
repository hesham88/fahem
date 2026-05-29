import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parentEmail = searchParams.get("parentEmail");

    if (!parentEmail) {
      return new Response(JSON.stringify({ error: "parentEmail is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest(`/parent/children?parentEmail=${encodeURIComponent(parentEmail)}`, "GET");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
