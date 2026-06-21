import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { requireUser } from "../../_auth";

export const dynamic = "force-dynamic";

// FC11.6: resolve the correct option for an in-page interactive question via book-grounded RAG.
// The heavy work (vector search + LLM + caching) runs in the agent backend on the caller's active
// DB (db_target), so a demo session resolves against the sandbox and a real user against prod.
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json().catch(() => ({}));
    if (!body?.book_id || !body?.block_id || !body?.prompt || !Array.isArray(body?.options)) {
      return new Response(JSON.stringify({ success: false, error: "Missing book_id, block_id, prompt or options" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const res = await proxyRequest("/reader/resolve-answer", "POST", body);
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || "resolve-answer failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
