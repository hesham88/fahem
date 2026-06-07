import { NextRequest } from "next/server";
import { getLocalDb } from "../../localDbHelper";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const db = getLocalDb();
    const config = db.config;

    // Returns { eligible: false } when sandbox or global config is off - no info leak
    if (!config || !config.evalSandboxEnabled) {
      return new Response(JSON.stringify({ eligible: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json().catch(() => ({}));
    const email = (body.email || "").trim().toLowerCase();

    if (!email) {
      return new Response(JSON.stringify({ eligible: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Check if whitelisted or matching demo domains
    const isWhitelisted = config.evalWhitelist?.map(e => e.toLowerCase()).includes(email);
    const domain = email.split("@")[1];
    const isDemoDomain = domain && config.demoDomains?.includes(domain);

    const eligible = !!(isWhitelisted || isDemoDomain || email === "hesham1988@gmail.com");

    return new Response(JSON.stringify({ eligible }), {
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
