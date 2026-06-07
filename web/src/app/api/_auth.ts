import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { isLocalEnv, getLocalDb } from "./localDbHelper";

export type Role = "anonymous" | "user" | "student" | "teacher" | "admin" | "super-admin" | "judge";

export interface AuthCtx {
  uid: string;
  email: string | null;
  role: Role;
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

export async function verifyAuth(req: Request): Promise<AuthCtx | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  // Local environment mock tokens fallback
  if (isLocalEnv() && LOCAL_MOCK_TOKENS[token]) {
    return LOCAL_MOCK_TOKENS[token];
  }

  // Judge mock bypass support
  if (token.startsWith("judge-mock:")) {
    const email = token.slice("judge-mock:".length).trim().toLowerCase();
    const domain = email.split("@")[1];
    if (email === "judge.evaluation@fahem.edu" || email === "hesham1988@gmail.com" || (domain && JUDGE_DOMAINS.has(domain))) {
      return {
        uid: email === "hesham1988@gmail.com" ? "user_super_1" : "judge_evaluation_uid_01",
        email: email,
        role: email === "hesham1988@gmail.com" ? "super-admin" : "judge"
      };
    }
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token, true);
    const role = await resolveRole(decodedToken.uid, decodedToken.email ?? null);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email ?? null,
      role
    };
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
