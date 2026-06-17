import { NextRequest } from "next/server";
import { proxyRequest } from "../proxy";
import { verifyAuth } from "../_auth";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../localDbHelper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await verifyAuth(req);
    if (!ctx) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { searchParams } = new URL(req.url);
    let userId = searchParams.get("userId");

    if (!userId) {
      userId = ctx.uid;
    }

    // IDOR Protection: Standard users can only view their own activities
    const isSelf = userId === ctx.uid;
    const isAdmin = ctx.role === "admin" || ctx.role === "super-admin";

    if (!isSelf && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: You do not have permission to view these activities" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // FC9.14: optional action filter so practice/zatona history isn't crowded out of the
    // window by high-volume agent-query logs.
    const action = searchParams.get("action");

    if (isLocalEnv()) {
      const db = getLocalDb();
      const activities = (db as any).user_activities || [];
      const actionSet = action ? new Set(action.split(",").map((a) => a.trim()).filter(Boolean)) : null;
      const userActivities = activities.filter(
        (act: any) => act.userId === userId && (!actionSet || actionSet.has(act.action))
      );
      return new Response(JSON.stringify({ activities: userActivities }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    let path = `/user/activity?userId=${encodeURIComponent(userId)}`;
    if (action) path += `&action=${encodeURIComponent(action)}`;
    return await proxyRequest(path, "GET", undefined, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await verifyAuth(req);
    if (!ctx) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const { action, status, details } = body;

    if (!action || !status) {
      return new Response(JSON.stringify({ error: "action and status are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Bind identity strictly to verified caller session
    const userId = ctx.uid;
    const userEmail = ctx.email ?? "anonymous@fahem.app";

    if (isLocalEnv()) {
      const db = getLocalDb();
      if (!(db as any).user_activities) {
        (db as any).user_activities = [];
      }
      const newActivity = {
        userId,
        userEmail,
        action,
        status,
        details,
        timestamp: new Date().toISOString()
      };
      (db as any).user_activities.unshift(newActivity); // insert at the top
      
      // Keep local list size bounded to 200 items
      if ((db as any).user_activities.length > 200) {
        (db as any).user_activities = (db as any).user_activities.slice(0, 200);
      }
      
      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, status: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/user/activity", "POST", {
      userId,
      userEmail,
      action,
      status,
      details
    }, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
