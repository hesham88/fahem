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
    // FC11.12: the email the visitor actually provided (typed or verified). `email` below gets
    // reassigned to a seeded persona address for unauthenticated sessions, so capture the real
    // entered email separately for the admin Sessions Monitor (null = unspecified → shared label).
    let enteredEmail: string | null = typedEmail || null;
    let isVerified = false;
    let tier = 0; // Tier-0 default (unverified/anonymous)
    let uid = "demo_anon_" + Math.random().toString(36).substring(2, 10);
    let role: Role = chosenPersona;

    // The platform owner / super-admin has NO elevated powers inside the sandbox:
    // they simply join as a Tier-1 evaluator (same judge-tier templates), scoped to
    // the sandbox database like any other demo session.
    const isSuperadminEmail = (email || "").toLowerCase() === "hesham1988@gmail.com"; // guard:allow-literal

    if (authCtx) {
      // User is verified via Firebase auth
      isVerified = true;
      email = authCtx.email;
      enteredEmail = authCtx.email;  // FC11.12: verified real email
      uid = authCtx.uid;

      const domain = email ? email.split("@")[1] : null;
      const isJudgeDomain = domain && config?.demoDomains?.includes(domain);
      const verifiedIsSuperadmin = (email || "").toLowerCase() === "hesham1988@gmail.com"; // guard:allow-literal

      if (isJudgeDomain || verifiedIsSuperadmin) {
        tier = 1; // Tier-1 (verified judge domain or owner) — judge-tier templates, sandbox only
        role = "judge";
      } else {
        // Logged-in standard user gets Tier-0 but with their verified email
        tier = 0;
        role = chosenPersona;
      }
    } else if (email) {
      // Best-effort check if typed email matches config.demoDomains (Tier-0 still, unverified!)
      const domain = email.split("@")[1];
      const isJudgeDomain = domain && config?.demoDomains?.includes(domain);

      if (isSuperadminEmail) {
        // Owner email joins the sandbox as a Tier-1 judge evaluator (sandbox-scoped, no special powers)
        tier = 1;
        role = "judge";
      } else {
        // Spoofed/typed email gets Tier-0 anonymous-level capability
        tier = 0;
        role = chosenPersona;
      }
    }

    // Map the demo persona to a pre-seeded sandbox user so every evaluation session
    // inherits realistic seeded history (practice, reading, insights) and token
    // telemetry — this is what makes the Daily Token Budget and history panels show
    // real numbers in the sandbox. Firebase-verified logins keep their real identity.
    const SANDBOX_PERSONA_USERS: Record<string, { uid: string; email: string }> = {
      student: { uid: "test_user_id_gemini_2026", email: "ziad.student@fahem.pro" }, // guard:allow-literal
      teacher: { uid: "test_teacher_id_gemini_2026", email: "tarek.teacher@fahem.pro" }, // guard:allow-literal
      admin: { uid: "sandbox_admin_demo_2026", email: "rana.admin@fahem.pro" }, // guard:allow-literal
    };
    if (!authCtx) {
      const seeded = SANDBOX_PERSONA_USERS[chosenPersona] || SANDBOX_PERSONA_USERS.student;
      uid = seeded.uid;
      email = seeded.email;
    }

    // FC7.5: when the sandbox is disabled it must be disabled for EVERYONE (all tiers, owner
    // included). The previous logic only blocked Tier-1 and silently let Tier-0 in under a
    // "low-capacity" notice — that is why "disabled" sandboxes were still usable.
    if (config && config.evalSandboxEnabled === false) {
      return new Response(JSON.stringify({
        success: false,
        error: "The evaluation sandbox is currently disabled. Please check back later."
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const capacityNotice = null;

    // Prepare demo token payload
    const sandboxSessionId = "sb_sess_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour short-lived TTL

    const payload = {
      uid: uid,
      email: email,
      role: role,
      db_target: "fahem_sandbox",
      sandbox_session_id: sandboxSessionId,
      tier: tier,
      exp: exp
    };

    const token = signDemoToken(payload);

    // FC9.10: privacy — do NOT capture or store the visitor's IP address. The Live
    // Demo Sessions Monitor identifies sessions by a non-identifying sequential
    // session number instead. (User-agent is retained for basic diagnostics.)
    const ua = req.headers.get("user-agent") || "unknown";

    // Monotonic session number used purely as a human-friendly label in the monitor.
    const anyDbCounter = db as any;
    anyDbCounter.demo_session_counter = (anyDbCounter.demo_session_counter || 0) + 1;
    const sessionNumber = anyDbCounter.demo_session_counter;

    const sessionDoc = {
      _id: "demo_session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      sandbox_session_id: sandboxSessionId,
      session_number: sessionNumber,
      uid: uid,
      email: email,
      entered_email: enteredEmail,  // FC11.12: what the visitor provided (null = unspecified)
      verified: isVerified,
      tier: tier,
      persona: role,
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
      details: { email, tier, role, sandboxSessionId, session_number: sessionNumber }
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
