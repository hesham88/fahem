import { NextRequest } from "next/server";
import { getLocalDb, isLocalEnv, getDbTarget } from "../../localDbHelper";
import { proxyRequest } from "../../proxy";
import { requireUser } from "../../_auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const userId = ctx.uid;

    // 1. Get system config and user-specific policy
    let config = {
      isTokenControlActive: true,
      weeklyAllocationLimit: 250000,
      monthlyAllocationLimit: 1000000
    };
    let tokenPolicy: any = null;

    if (isLocalEnv()) {
      const db = getLocalDb();
      if (db.config) {
        config = { ...config, ...db.config };
      }
      const user = (db.users || []).find((u: any) => u.userId === userId);
      if (user && user.tokenPolicy) {
        tokenPolicy = user.tokenPolicy;
      }
    } else {
      // Production: fetch config and user-policy from backend proxy
      try {
        const { proxyRequest } = require("../../proxy");
        const proxyRes = await proxyRequest("/user/token-policy", "GET", undefined, ctx);
        if (proxyRes.ok) {
          const resData = await proxyRes.json();
          if (resData && resData.success) {
            config = { ...config, ...resData.config };
            tokenPolicy = resData.tokenPolicy;
          }
        }
      } catch (err) {
        console.warn("[token-stats-api] Proxy user policy fetch failed:", err);
      }
    }

    // 2. Compute effective limits
    const enabled = tokenPolicy && tokenPolicy.enabled !== undefined ? tokenPolicy.enabled : config.isTokenControlActive;
    const weeklyLimit = tokenPolicy && tokenPolicy.weeklyLimit !== undefined ? tokenPolicy.weeklyLimit : config.weeklyAllocationLimit;
    const monthlyLimit = tokenPolicy && tokenPolicy.monthlyLimit !== undefined ? tokenPolicy.monthlyLimit : config.monthlyAllocationLimit;

    // 3. Get actual token usage (proxy in production, fallback in local)
    let used = { daily: 0, weekly: 0, monthly: 0, total: 0 };
    if (isLocalEnv()) {
      // Return mock values or sum from mock token telemetry if it existed (we'll just use minor mock numbers)
      used = { daily: 12000, weekly: 45000, monthly: 110000, total: 110000 };
    } else {
      try {
        const emailQs = ctx.email ? `&userEmail=${encodeURIComponent(ctx.email)}` : "";
        const proxyRes = await proxyRequest(`/user/token-stats?userId=${encodeURIComponent(userId)}${emailQs}`, "GET", undefined, ctx);
        if (proxyRes.ok) {
          const data = await proxyRes.json();
          if (data && data.stats) {
            const stats = data.stats;
            // The backend may return each bucket either as a plain number or as an
            // object { total: n }. Normalise both shapes so the widget never reads 0.
            const num = (v: any): number => {
              if (v === null || v === undefined) return 0;
              if (typeof v === "object") return Number(v.total) || 0;
              return Number(v) || 0;
            };
            used = {
              daily: num(stats.daily),
              weekly: num(stats.weekly),
              monthly: num(stats.monthly),
              total: num(stats.total)
            };
          }
        }
      } catch (err) {
        console.error("[token-stats-api] Proxying usage failed:", err);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      used,
      limit: {
        weekly: weeklyLimit,
        monthly: monthlyLimit
      },
      enabled
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[token-stats-api] GET failed:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
