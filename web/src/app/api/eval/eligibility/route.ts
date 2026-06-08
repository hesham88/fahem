import { NextRequest } from "next/server";
import { getLocalDb } from "../../localDbHelper";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const db = getLocalDb();
    const config = db.config;

    // Public users are eligible for Tier-0 public sandbox tryouts regardless of global capacity limit.
    const capacityLimited = !config || !config.evalSandboxEnabled;

    const body = await req.json().catch(() => ({}));
    const email = (body.email || "").trim().toLowerCase();

    if (!email) {
      return new Response(JSON.stringify({ eligible: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // All typed emails or empty inputs are eligible for Tier-0 public sandbox
    const eligible = true;
    return new Response(JSON.stringify({ eligible, capacityLimited }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[eval-eligibility] POST failed:", err);
    return new Response(JSON.stringify({ eligible: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
