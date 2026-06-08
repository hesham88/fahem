import { NextRequest } from "next/server";
import { getLocalDb, saveLocalDb, isLocalEnv } from "../../localDbHelper";
import { proxyRequest } from "../../proxy";
import { requireAdmin } from "../../_auth";

export const dynamic = "force-dynamic";

const DEFAULT_WHITELIST = [
  ["judge.evaluation", "fahem.edu"].join("@"),
  ["hesham1988", "gmail.com"].join("@")
];

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;

    if (isLocalEnv()) {
      const db = getLocalDb();
      if (!db.config) {
        db.config = {
          isTokenControlActive: true,
          weeklyAllocationLimit: 250000,
          monthlyAllocationLimit: 1000000,
          maxUploadSize: 2,
          evalSandboxEnabled: false,
          evalWhitelist: DEFAULT_WHITELIST,
          demoDomains: ["google.com", "mongodb.com", "devpost.com"]
        };
        saveLocalDb(db);
      }
      return new Response(JSON.stringify({ success: true, config: db.config }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // In production, we fallback to local DB config as well if proxy fails, or we can proxy
    // Let's try proxying first
    try {
      const proxyRes = await proxyRequest("/admin/config", "GET", undefined, ctx);
      if (proxyRes.ok) {
        return proxyRes;
      }
    } catch (err) {
      console.warn("[admin-config-api] Proxying config failed, falling back to local DB", err);
    }

    const db = getLocalDb();
    if (!db.config) {
      db.config = {
        isTokenControlActive: true,
        weeklyAllocationLimit: 250000,
        monthlyAllocationLimit: 1000000,
        maxUploadSize: 2,
        evalSandboxEnabled: false,
        evalWhitelist: DEFAULT_WHITELIST,
        demoDomains: ["google.com", "mongodb.com", "devpost.com"]
      };
      saveLocalDb(db);
    }
    return new Response(JSON.stringify({ success: true, config: db.config }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[admin-config-api] GET failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const { 
      isTokenControlActive, 
      weeklyAllocationLimit, 
      monthlyAllocationLimit, 
      maxUploadSize,
      evalSandboxEnabled,
      evalWhitelist,
      demoDomains
    } = body;

    // Determine if requester is an admin that requires superadmin approval
    const isSuper = ctx.role === "super-admin";
    const needsApproval = !isSuper;

    if (needsApproval) {
      const db = getLocalDb();
      const requestId = "req_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
      const changeRequest = {
        id: requestId,
        requesterEmail: ctx.email,
        actionType: "update_config",
        payload: { 
          isTokenControlActive, 
          weeklyAllocationLimit, 
          monthlyAllocationLimit, 
          maxUploadSize,
          evalSandboxEnabled,
          evalWhitelist,
          demoDomains
        },
        status: "pending",
        createdAt: new Date().toISOString()
      };
      db.admin_change_requests = db.admin_change_requests || [];
      db.admin_change_requests.push(changeRequest);
      saveLocalDb(db);

      return new Response(JSON.stringify({ success: true, needsApproval: true, message: "Your request has been submitted for Superadmin approval." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      db.config = {
        isTokenControlActive: isTokenControlActive !== undefined ? !!isTokenControlActive : true,
        weeklyAllocationLimit: Number(weeklyAllocationLimit) || 250000,
        monthlyAllocationLimit: Number(monthlyAllocationLimit) || 1000000,
        maxUploadSize: Number(maxUploadSize) || 2,
        evalSandboxEnabled: evalSandboxEnabled !== undefined ? !!evalSandboxEnabled : false,
        evalWhitelist: Array.isArray(evalWhitelist) ? evalWhitelist : DEFAULT_WHITELIST,
        demoDomains: Array.isArray(demoDomains) ? demoDomains : ["google.com", "mongodb.com", "devpost.com"]
      };
      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, config: db.config }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      const proxyRes = await proxyRequest("/admin/config", "POST", { 
        isTokenControlActive, 
        weeklyAllocationLimit, 
        monthlyAllocationLimit, 
        maxUploadSize,
        evalSandboxEnabled,
        evalWhitelist,
        demoDomains
      }, ctx);
      if (proxyRes.ok) {
        return proxyRes;
      }
    } catch (err) {
      console.warn("[admin-config-api] Proxying config save failed, falling back to local DB write", err);
    }

    const db = getLocalDb();
    db.config = {
      isTokenControlActive: isTokenControlActive !== undefined ? !!isTokenControlActive : true,
      weeklyAllocationLimit: Number(weeklyAllocationLimit) || 250000,
      monthlyAllocationLimit: Number(monthlyAllocationLimit) || 1000000,
      maxUploadSize: Number(maxUploadSize) || 2,
      evalSandboxEnabled: evalSandboxEnabled !== undefined ? !!evalSandboxEnabled : false,
      evalWhitelist: Array.isArray(evalWhitelist) ? evalWhitelist : DEFAULT_WHITELIST,
      demoDomains: Array.isArray(demoDomains) ? demoDomains : ["google.com", "mongodb.com", "devpost.com"]
    };
    saveLocalDb(db);
    return new Response(JSON.stringify({ success: true, config: db.config }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[admin-config-api] POST failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

