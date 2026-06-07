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
      // Production: fetch from DB
      try {
        const { MongoClient } = require("mongodb");
        const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
        const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
        await client.connect();
        const db = client.db(getDbTarget());

        // Config doc
        const dbConfig = await db.collection("config").findOne({});
        if (dbConfig) {
          config = { ...config, ...dbConfig };
        }

        // User policy
        const userDoc = await db.collection("users").findOne({ userId });
        if (userDoc && userDoc.tokenPolicy) {
          tokenPolicy = userDoc.tokenPolicy;
        }

        await client.close();
      } catch (err) {
        console.warn("[token-stats-api] DB fetch failed, using local/defaults:", err);
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
        const proxyRes = await proxyRequest(`/user/token-stats?userId=${encodeURIComponent(userId)}`, "GET", undefined, ctx);
        if (proxyRes.ok) {
          const data = await proxyRes.json();
          if (data && data.stats) {
            const stats = data.stats;
            used = {
              daily: stats.daily?.total || 0,
              weekly: stats.weekly?.total || 0,
              monthly: stats.monthly?.total || 0,
              total: stats.total?.total || 0
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
