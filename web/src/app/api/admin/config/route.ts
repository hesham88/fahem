import { NextRequest } from "next/server";
import { getLocalDb, saveLocalDb, isLocalEnv } from "../../localDbHelper";
import { proxyRequest } from "../../proxy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (isLocalEnv()) {
      const db = getLocalDb();
      if (!db.config) {
        db.config = {
          isTokenControlActive: true,
          weeklyAllocationLimit: 250000,
          monthlyAllocationLimit: 1000000,
          maxUploadSize: 2
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
      const proxyRes = await proxyRequest("/admin/config", "GET");
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
        maxUploadSize: 2
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
    const body = await req.json();
    const { isTokenControlActive, weeklyAllocationLimit, monthlyAllocationLimit, maxUploadSize } = body;

    if (isLocalEnv()) {
      const db = getLocalDb();
      db.config = {
        isTokenControlActive: isTokenControlActive !== undefined ? !!isTokenControlActive : true,
        weeklyAllocationLimit: Number(weeklyAllocationLimit) || 250000,
        monthlyAllocationLimit: Number(monthlyAllocationLimit) || 1000000,
        maxUploadSize: Number(maxUploadSize) || 2
      };
      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, config: db.config }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      const proxyRes = await proxyRequest("/admin/config", "POST", body);
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
      maxUploadSize: Number(maxUploadSize) || 2
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
