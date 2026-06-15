import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { isLocalEnv, getLocalDb, dbContextStorage } from "./localDbHelper";
import { proxyRequest } from "./proxy";
import crypto from "crypto";

export type Role = "anonymous" | "user" | "student" | "teacher" | "admin" | "super-admin" | "judge";

export interface AuthCtx {
  uid: string;
  email: string | null;
  role: Role;
  db_target?: string;
  sandbox_session_id?: string;
  tier?: number;
}

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    if (process.env.FIREBASE_ADMIN_KEY) {
      initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY)),
      });
    } else {
      initializeApp({
        credential: applicationDefault(),
      });
    }
  } catch (err) {
    console.error("[auth] Firebase Admin SDK initialization failed:", err);
  }
}

// Retrieve superadmin emails from environment variables or default to the owner
const getSuperadminEmails = (): Set<string> => {
  const emails = new Set<string>();
  emails.add("hesham1988@gmail.com"); // default // guard:allow-literal
  let raw = process.env.SUPERADMIN_USER || "";
  raw = raw.trim().replace(/^['"]|['"]$/g, "");
  if (raw) {
    raw.split(",").forEach(email => emails.add(email.trim().toLowerCase().replace(/^['"]|['"]$/g, "")));
  }
  return emails;
};

const JUDGE_DOMAINS = new Set(["google.com", "mongodb.com", "devpost.com"]);

export async function resolveRole(uid: string, email: string | null): Promise<Role> {
  const normalizedEmail = (email ?? "").toLowerCase().trim();

  // 1. Superadmin env check (Precedence 1)
  const superadmins = getSuperadminEmails();
  if (normalizedEmail && superadmins.has(normalizedEmail)) {
    return "super-admin";
  }

  // 2. Judge domain check (Precedence 2)
  if (normalizedEmail) {
    const domain = normalizedEmail.split("@")[1];
    if (domain && JUDGE_DOMAINS.has(domain)) {
      return "judge";
    }
  }

  // 3. Database role check (Precedence 3)
  if (isLocalEnv()) {
    const db = getLocalDb();
    const user = (db.users || []).find(u => u.userId === uid || (normalizedEmail && u.email?.toLowerCase().trim() === normalizedEmail));
    if (user && user.role) {
      return user.role as Role;
    }
  } else {
    try {
      const url = `/auth/resolve-role?uid=${encodeURIComponent(uid)}` + (normalizedEmail ? `&email=${encodeURIComponent(normalizedEmail)}` : "");
      const res = await proxyRequest(url, "GET");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.role) {
          return data.role as Role;
        }
      }
    } catch (dbErr) {
      console.error("[auth] Failed to retrieve user role from production database via proxy:", dbErr);
    }
  }

  return "user";
}

// Local mock tokens for easy development and offline testing
const LOCAL_MOCK_TOKENS: Record<string, AuthCtx> = {
  "mock-student": { uid: "user_student_1", email: "ahmed@student.edu", role: "student" },
  "mock-teacher": { uid: "user_teacher_1", email: "mostafa@teacher.edu", role: "teacher" },
  "mock-admin": { uid: "user_admin_1", email: "admin@fahem.edu", role: "admin" },
  "mock-super": { uid: "user_super_1", email: "hesham1988@gmail.com", role: "super-admin" }, // guard:allow-literal
  "mock-superadmin": { uid: "user_super_1", email: "hesham1988@gmail.com", role: "super-admin" }, // guard:allow-literal
};

const EVAL_SIGNING_KEY = process.env.EVAL_SIGNING_KEY || "fahem_default_eval_signing_key_secret_2026_xyz";

export function signDemoToken(payload: { uid: string; email: string | null; role: Role; db_target: string; sandbox_session_id?: string; tier?: number; exp: number }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", EVAL_SIGNING_KEY).update(`${header}.${body}`).digest("base64url");
  return `demo-token:${header}.${body}.${signature}`;
}

async function getDBConfig() {
  if (isLocalEnv()) {
    return getLocalDb().config || { evalSandboxEnabled: false };
  }
  try {
    const res = await proxyRequest("/admin/config", "GET");
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.config) {
        return data.config;
      }
    }
    return { evalSandboxEnabled: false };
  } catch (err) {
    console.error("[auth] Failed to retrieve config from production DB via proxy:", err);
    return getLocalDb().config || { evalSandboxEnabled: false };
  }
}

export async function verifyDemoToken(token: string): Promise<AuthCtx | null> {
  if (!token.startsWith("demo-token:")) return null;
  const parts = token.slice("demo-token:".length).split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSignature = crypto.createHmac("sha256", EVAL_SIGNING_KEY).update(`${header}.${body}`).digest("base64url");
  if (signature !== expectedSignature) return null;
  
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      return null; // Expired
    }

    // Demo sandbox sessions must strictly be Tier-0 (anonymous/typed) or Tier-1 (verified judge domain).
    // Any other tier is invalid and is rejected to keep the sandbox scoped and fail-closed.
    const declaredTier = payload.tier !== undefined ? Number(payload.tier) : 0;
    if (declaredTier !== 0 && declaredTier !== 1) {
      return null;
    }

    // Demo tokens are sandbox-only: never allow one to resolve to the production database.
    if (payload.db_target && payload.db_target !== "fahem_sandbox") {
      return null;
    }

    // FC7.5: a disabled sandbox is disabled for EVERYONE. Reject ALL demo tokens (every tier,
    // including already-issued sessions) so flipping the switch off immediately locks the sandbox.
    const config = await getDBConfig();
    if (config && config.evalSandboxEnabled === false) {
      return null;
    }

    // FC7.4 (corrected model): a sandbox/demo identity is NEVER privileged. Clamp any
    // admin/super-admin/judge persona down to a non-privileged role so requireAdmin /
    // requireSuperadmin / requireJudge all reject demo tokens at the API layer (defense-in-depth
    // mirroring the backend db_target=='fahem_sandbox' role clamp). Tier (budget) is unaffected.
    const PRIVILEGED_DEMO_ROLES = new Set(["admin", "super-admin", "judge"]);
    const safeDemoRole: Role = PRIVILEGED_DEMO_ROLES.has(payload.role) ? "user" : (payload.role as Role);
    payload.role = safeDemoRole;

    // Check if this session has been killed or ended by an admin
    if (payload.sandbox_session_id) {
      let isKilled = true; // Fail closed by default
      const ctxPayload = {
        uid: payload.uid,
        email: payload.email,
        role: payload.role as Role,
        db_target: payload.db_target || "fahem_sandbox",
        sandbox_session_id: payload.sandbox_session_id,
        tier: payload.tier
      };
      if (isLocalEnv()) {
        const db = getLocalDb() as any;
        const session = (db.demo_sessions || []).find((s: any) => s.sandbox_session_id === payload.sandbox_session_id);
        if (session && session.status !== "killed" && session.status !== "ended") {
          isKilled = false; // Successfully verified as active (not killed/ended)
        }
      } else {
        try {
          const res = await proxyRequest(`/auth/session-status?sandbox_session_id=${encodeURIComponent(payload.sandbox_session_id)}`, "GET", undefined, ctxPayload);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.status !== "killed" && data.status !== "ended") {
              isKilled = false; // Successfully verified as active (not killed/ended)
            }
          }
        } catch (err) {
          console.error("[auth] Failed to check demo session status in production DB via proxy:", err);
        }
      }
      if (isKilled) {
        return null; // Token revoked or unverifiable! Fail closed.
      }
    }

    return {
      uid: payload.uid,
      email: payload.email,
      role: payload.role as Role,
      db_target: payload.db_target || "fahem_sandbox",
      sandbox_session_id: payload.sandbox_session_id,
      tier: payload.tier
    };
  } catch (err) {
    return null;
  }
}

export async function verifyAuth(req: Request): Promise<AuthCtx | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  // 1. Verify demo token
  if (token.startsWith("demo-token:")) {
    const ctx = await verifyDemoToken(token);
    if (ctx) {
      dbContextStorage.enterWith({ db_target: ctx.db_target || "fahem_sandbox" });
      return ctx;
    }
    return null;
  }

  // 2. Local environment mock tokens fallback
  if (isLocalEnv() && LOCAL_MOCK_TOKENS[token]) {
    const ctx = { ...LOCAL_MOCK_TOKENS[token], db_target: "fahem" };
    dbContextStorage.enterWith({ db_target: "fahem" });
    return ctx;
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token, true);
    const role = await resolveRole(decodedToken.uid, decodedToken.email ?? null);
    const ctx = {
      uid: decodedToken.uid,
      email: decodedToken.email ?? null,
      role,
      db_target: "fahem"
    };
    dbContextStorage.enterWith({ db_target: "fahem" });
    return ctx;
  } catch (err) {
    // Fail-closed on any verification error
    return null;
  }
}

export async function requireUser(req: Request): Promise<AuthCtx | Response> {
  const ctx = await verifyAuth(req);
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing authentication token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  return ctx;
}

export async function requireAdmin(req: Request): Promise<AuthCtx | Response> {
  const ctx = await verifyAuth(req);
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing authentication token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (ctx.role !== "admin" && ctx.role !== "super-admin" && ctx.role !== "judge") {
    return new Response(JSON.stringify({ error: "Forbidden: Administrative access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  return ctx;
}

export async function requireSuperadmin(req: Request): Promise<AuthCtx | Response> {
  const ctx = await verifyAuth(req);
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing authentication token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (ctx.role !== "super-admin") {
    return new Response(JSON.stringify({ error: "Forbidden: Super-administrator access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  return ctx;
}

export async function requireJudge(req: Request): Promise<AuthCtx | Response> {
  const ctx = await verifyAuth(req);
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing authentication token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (ctx.role !== "judge" && ctx.role !== "admin" && ctx.role !== "super-admin") {
    return new Response(JSON.stringify({ error: "Forbidden: Judge or administrator access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  return ctx;
}
