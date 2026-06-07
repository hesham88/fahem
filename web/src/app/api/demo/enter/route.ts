import { NextRequest } from "next/server";
import { getLocalDb, saveLocalDb, isLocalEnv } from "../../localDbHelper";
import { verifyAuth, signDemoToken, Role } from "../../_auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const db = getLocalDb();
    const config = db.config;

    // Check if evaluation/demo sandbox is enabled
    if (!config || !config.evalSandboxEnabled) {
      return new Response(JSON.stringify({ success: false, error: "Demo Sandbox is currently disabled." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

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
      
      const isOwner = email === "hesham1988@gmail.com";
      const domain = email ? email.split("@")[1] : null;
      const isJudgeDomain = domain && config.demoDomains?.includes(domain);

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
      const isJudgeDomain = domain && config.demoDomains?.includes(domain);
      
      // Spoofed/typed email gets Tier-0 anonymous-level capability
      tier = 0;
      role = chosenPersona;
    }

    // Prepare demo token payload
    const sandboxSessionId = "sb_sess_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour short-lived TTL

    const payload = {
      uid: uid,
      email: email,
      role: role,
      db_target: "fahem_sandbox",
      sandbox_session_id: sandboxSessionId,
      exp: exp
    };

    const token = signDemoToken(payload);

    // Record demo signup/session in audit store
    const ip = req.headers.get("x-forwarded-for") || (req as any).ip || "127.0.0.1";
    const ua = req.headers.get("user-agent") || "unknown";

    const sessionDoc = {
      _id: "demo_session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      sandbox_session_id: sandboxSessionId,
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
    anyDb.demo_sessions.push(sessionDoc);

    saveLocalDb(db);

    // Also persist to MongoDB demo_sessions if in production
    if (!isLocalEnv()) {
      try {
        const { MongoClient } = require("mongodb");
        const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
        const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
        await client.connect();
        const mongoDb = client.db("fahem"); // audit store is in main prod DB
        await mongoDb.collection("demo_sessions").insertOne(sessionDoc);
        await client.close();
      } catch (err) {
        console.error("[demo-enter] Failed to write demo session to Mongo audit store:", err);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      token: token,
      app_mode: "demo",
      expires_at: exp,
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
