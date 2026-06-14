import { NextRequest } from "next/server";
import { getLocalDb, saveLocalDb, isLocalEnv, getDbTarget } from "../../localDbHelper";
import { proxyRequest } from "../../proxy";
import { requireAdmin } from "../../_auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId query parameter is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    let userPolicy = null;
    let userEmail = "";
    let userName = "";

    if (isLocalEnv()) {
      const db = getLocalDb();
      const user = (db.users || []).find((u: any) => u.userId === userId);
      if (user) {
        userPolicy = user.tokenPolicy || null;
        userEmail = user.email || "";
        userName = user.name || "";
      }
    } else {
      // Production: query Mongo via Cloud Run backend proxy
      const proxyRes = await proxyRequest(`/admin/user-token-policy?userId=${encodeURIComponent(userId)}`, "GET", undefined, ctx);
      if (proxyRes.ok) {
        const data = await proxyRes.json();
        if (data.success) {
          userPolicy = data.tokenPolicy || null;
          userEmail = data.email || "";
          userName = data.name || "";
        }
      } else {
        throw new Error(`Backend user token policy query failed: ${proxyRes.statusText}`);
      }
    }

    // Retrieve usage stats from backend
    let used = { daily: 0, weekly: 0, monthly: 0, total: 0 };
    if (isLocalEnv()) {
      used = { daily: 5000, weekly: 15000, monthly: 45000, total: 45000 };
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
        console.error("[admin-user-token-policy-api] Proxying usage failed:", err);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      userId,
      email: userEmail,
      name: userName,
      tokenPolicy: userPolicy,
      used
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[admin-user-token-policy-api] GET failed:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
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
    const { userId, enabled, dailyLimit, weeklyLimit, monthlyLimit, reason, clearPolicy } = body;

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const tokenPolicy = clearPolicy ? null : {
      enabled: enabled !== undefined ? !!enabled : true,
      dailyLimit: dailyLimit !== undefined ? Number(dailyLimit) : 35714,
      weeklyLimit: weeklyLimit !== undefined ? Number(weeklyLimit) : 250000,
      monthlyLimit: monthlyLimit !== undefined ? Number(monthlyLimit) : 1000000,
      reason: reason || "admin override"
    };

    if (isLocalEnv()) {
      const db = getLocalDb();
      db.users = db.users || [];
      const userIndex = db.users.findIndex((u: any) => u.userId === userId);
      if (userIndex === -1) {
        return new Response(JSON.stringify({ error: "User not found in local database." }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (clearPolicy) {
        delete db.users[userIndex].tokenPolicy;
      } else {
        db.users[userIndex].tokenPolicy = tokenPolicy;
      }
      saveLocalDb(db);

      return new Response(JSON.stringify({ success: true, message: "User token policy updated.", tokenPolicy }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Production: proxy update to Cloud Run backend
    const proxyRes = await proxyRequest("/admin/user-token-policy", "POST", body, ctx);
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success) {
        return new Response(JSON.stringify({ success: true, message: "User token policy updated successfully.", tokenPolicy: data.tokenPolicy }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } else {
        return new Response(JSON.stringify({ error: data.error || "Failed to update user token policy on backend." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    } else {
      throw new Error(`Backend token policy update failed: ${proxyRes.statusText}`);
    }

  } catch (err: any) {
    console.error("[admin-user-token-policy-api] POST failed:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
