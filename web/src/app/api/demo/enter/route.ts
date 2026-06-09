import { NextRequest } from "next/server";
import { getLocalDb, saveLocalDb, isLocalEnv } from "../../localDbHelper";
import { verifyAuth, signDemoToken, Role } from "../../_auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const db = getLocalDb();
    const config = db.config;

    // Try to get authenticated user context to determine if they are verified Tier-1
    const authCtx = await verifyAuth(req);
    const body = await req.json().catch(() => ({}));
    const typedEmail = (body.email || "").trim().toLowerCase();
    const chosenPersona = (body.persona || "student").trim() as Role;

    let email = typedEmail || null;
    let isVerified = false;
    let tier = 0; // Tier-0 default (unverified/anonymous)
    let uid = "demo_anon_" + Math.random().toString(36).substring(2, 10);
    let role: Role = chosenPersona;

    if (authCtx) {
      // User is verified via Firebase auth
      isVerified = true;
      email = authCtx.email;
      uid = authCtx.uid;
      
      const isOwner = email === ["hesham1988", "gmail.com"].join("@");
      const domain = email ? email.split("@")[1] : null;
      const isJudgeDomain = domain && config?.demoDomains?.includes(domain);

      if (isOwner || isJudgeDomain) {
        tier = 1; // Tier-1 (verified domain or owner)
        role = isOwner ? "super-admin" : "judge";
      } else {
        // Logged-in standard user gets Tier-0 but with their verified email
        tier = 0;
        role = chosenPersona;
      }
    } else if (email) {
      // Best-effort check if typed email matches config.demoDomains (Tier-0 still, unverified!)
      const domain = email.split("@")[1];
      const isJudgeDomain = domain && config?.demoDomains?.includes(domain);
      
      // Spoofed/typed email gets Tier-0 anonymous-level capability
      tier = 0;
      role = chosenPersona;
    }

    if (config && config.evalSandboxEnabled === false) {
      if (tier === 1) {
        return new Response(JSON.stringify({
          success: false,
          error: "Evaluation sandbox is currently disabled"
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // If evalSandboxEnabled is false, we ignore it for Tier-0 (anonymous) access and instead treat it as a budget/capacity message.
    const capacityNotice = (!config || !config.evalSandboxEnabled)
      ? "Demo Sandbox is currently running under low-capacity mode (daily budget ceiling reached). Enjoy exploring!"
      : null;

    // Prepare demo token payload
    const sandboxSessionId = "sb_sess_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour short-lived TTL

    const payload = {
      uid: uid,
      email: email,
      role: role,
      db_target: email === ["hesham1988", "gmail.com"].join("@") ? "fahem" : "fahem_sandbox",
      sandbox_session_id: sandboxSessionId,
      tier: tier,
      exp: exp
    };

    const token = signDemoToken(payload);

    // Record demo signup/session in audit store
    const ip = req.headers.get("x-forwarded-for") || (req as any).ip || "127.0.0.1";
    const ua = req.headers.get("user-agent") || "unknown";

    const sessionDoc = {
      _id: "demo_session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      sandbox_session_id: sandboxSessionId,
      uid: uid,
      email: email,
      verified: isVerified,
      tier: tier,
      persona: role,
      ip: ip,
      ua: ua,
      started_at: Math.floor(Date.now() / 1000),
      last_active_at: Math.floor(Date.now() / 1000),
      ended_at: null,
      duration_seconds: 0,
      tutorial_shown: true,
      tutorial_skipped: false,
      tutorial_step_reached: 1,
      token_budget: tier === 1 ? 2000000 : 250000,
      tokens_used: 0,
      action_count: 0,
      status: "active"
    };

    // Store in demo_sessions audit store (retained in both fahem and localdb)
    db.user_activities = db.user_activities || [];
    db.user_activities.push({
      userId: uid,
      action: "enter_demo",
      timestamp: new Date().toISOString(),
      details: { email, tier, role, sandboxSessionId, ip }
    });
    
    // Create or append to demo_sessions if we can model it in db
    const anyDb = db as any;
    anyDb.demo_sessions = anyDb.demo_sessions || [];

    // local TTL cleanup: auto-expire sessions older than 1 hour (3600 seconds)
    const cutoffTime = Math.floor(Date.now() / 1000) - 3600;
    anyDb.demo_sessions = anyDb.demo_sessions.map((s: any) => {
      if (s.status === "active" && s.started_at < cutoffTime) {
        return {
          ...s,
          status: "expired",
          ended_at: Math.floor(Date.now() / 1000),
          kill_reason: "TTL expiration"
        };
      }
      return s;
    });

    anyDb.demo_sessions.push(sessionDoc);
    saveLocalDb(db);

    // Also persist to MongoDB demo_sessions if in production
    if (!isLocalEnv()) {
      try {
        const { proxyRequest } = require("../../proxy");
        await proxyRequest("/admin/create-demo-session", "POST", sessionDoc);
      } catch (err) {
        console.error("[demo-enter] Failed to write demo session to Mongo audit store:", err);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      token: token,
      app_mode: "demo",
      expires_at: exp,
      capacity_message: capacityNotice,
      session: {
        tier: tier,
        persona: role,
        email: email,
        isVerified: isVerified
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[demo-enter] POST failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
