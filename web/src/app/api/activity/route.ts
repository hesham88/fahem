import { NextRequest } from "next/server";
import { proxyRequest } from "../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../localDbHelper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      const activities = (db as any).user_activities || [];
      // Filter activities belonging to this user
      const userActivities = activities.filter((act: any) => act.userId === userId);
      return new Response(JSON.stringify({ activities: userActivities }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest(`/user/activity?userId=${encodeURIComponent(userId)}`, "GET");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userEmail, action, status, details } = body;

    if (!userId || !userEmail || !action || !status) {
      return new Response(JSON.stringify({ error: "userId, userEmail, action, and status are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

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
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
