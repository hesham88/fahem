import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { isLocalEnv, getLocalDb, dbContextStorage } from "./localDbHelper";
import crypto from "crypto";

export type Role = "anonymous" | "user" | "student" | "teacher" | "admin" | "super-admin" | "judge";

export interface AuthCtx {
  uid: string;
  email: string | null;
  role: Role;
  db_target?: string;
  sandbox_session_id?: string;
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
  emails.add("hesham1988@gmail.com"); // default
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
      const { MongoClient } = require("mongodb");
      const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
      await client.connect();
      const db = client.db("fahem");
      
      const user = await db.collection("users").findOne({
        $or: [
          { userId: uid },
          ...(normalizedEmail ? [{ email: normalizedEmail }] : [])
        ]
      });
      await client.close();
      if (user && user.role) {
        return user.role as Role;
      }
    } catch (dbErr) {
      console.error("[auth] Failed to retrieve user role from production database:", dbErr);
    }
  }

  return "user";
}

// Local mock tokens for easy development and offline testing
const LOCAL_MOCK_TOKENS: Record<string, AuthCtx> = {
  "mock-student": { uid: "user_student_1", email: "ahmed@student.edu", role: "student" },
  "mock-teacher": { uid: "user_teacher_1", email: "mostafa@teacher.edu", role: "teacher" },
  "mock-admin": { uid: "user_admin_1", email: "admin@fahem.edu", role: "admin" },
  "mock-super": { uid: "user_super_1", email: "hesham1988@gmail.com", role: "super-admin" },
  "mock-superadmin": { uid: "user_super_1", email: "hesham1988@gmail.com", role: "super-admin" },
};

const EVAL_SIGNING_KEY = process.env.EVAL_SIGNING_KEY || "fahem_default_eval_signing_key_secret_2026_xyz";

export function signDemoToken(payload: { uid: string; email: string | null; role: Role; db_target: string; sandbox_session_id?: string; exp: number }): string {
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
    const { MongoClient } = require("mongodb");
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
    await client.connect();
    const db = client.db("fahem");
    const config = await db.collection("config").findOne({});
    await client.close();
    return config || { evalSandboxEnabled: false };
  } catch (err) {
    console.error("[auth] Failed to retrieve config from production DB:", err);
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
    
    // Allow demo tokens to bypass strict evalSandboxEnabled block for public Tier-0 or when capacity limits are active.
    const config = await getDBConfig();
    if (config && config.evalSandboxEnabled === false && !payload.uid.startsWith("demo_anon_")) {
      // Keep it active for anonymous tryouts or judges
    }

    return {
      uid: payload.uid,
      email: payload.email,
      role: payload.role as Role,
      db_target: payload.db_target || "fahem_sandbox",
      sandbox_session_id: payload.sandbox_session_id
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
      // Check if this session has been killed or ended by an admin
      let isKilled = false;
      if (ctx.sandbox_session_id) {
        if (isLocalEnv()) {
          const db = getLocalDb() as any;
          const session = (db.demo_sessions || []).find((s: any) => s.sandbox_session_id === ctx.sandbox_session_id);
          if (session && (session.status === "killed" || session.status === "ended")) {
            isKilled = true;
          }
        } else {
          try {
            const { MongoClient } = require("mongodb");
            const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
            const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
            await client.connect();
            const db = client.db("fahem");
            const session = await db.collection("demo_sessions").findOne({ sandbox_session_id: ctx.sandbox_session_id });
            await client.close();
            if (session && (session.status === "killed" || session.status === "ended")) {
              isKilled = true;
            }
          } catch (err) {
            console.error("[auth] Failed to check demo session status in production DB:", err);
          }
        }
      }
      if (isKilled) {
        return null; // Token revoked!
      }

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
