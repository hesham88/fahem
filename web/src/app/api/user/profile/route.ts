import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { checkIsAdmin, checkIsSuperadmin } from "../../admin/helper";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../../localDbHelper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const username = searchParams.get("username");
    const email = searchParams.get("email");

    if (!userId && !username && !email) {
      return new Response(JSON.stringify({ error: "userId, username or email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      const userList = db.users || [];
      const user = userList.find(u => 
        (userId && u.userId === userId) ||
        (username && u.username === username) ||
        (email && u.email?.toLowerCase() === email.toLowerCase())
      );
      if (user) {
        return new Response(JSON.stringify({ success: true, profile: user }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ error: "User profile not found locally" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);
    if (username) params.append("username", username);
    if (email) params.append("email", email);

    return await proxyRequest(`/user/profile?${params.toString()}`, "GET");
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
    const { userId, profile, requesterEmail } = body;

    if (!userId || !profile) {
      return new Response(JSON.stringify({ error: "userId and profile are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Determine if requester is an admin that requires superadmin approval
    let needsApproval = false;
    if (requesterEmail) {
      const isAdmin = await checkIsAdmin(requesterEmail);
      const isSuper = await checkIsSuperadmin(requesterEmail);
      needsApproval = isAdmin && !isSuper;
    }

    if (needsApproval) {
      // Append request to admin_change_requests
      const db = getLocalDb();
      const requestId = "req_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
      const changeRequest = {
        id: requestId,
        requesterEmail,
        actionType: "update_user_profile",
        payload: { userId, profile },
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
      db.users = db.users || [];
      const idx = db.users.findIndex(u => u.userId === userId);
      if (idx >= 0) {
        db.users[idx] = {
          ...db.users[idx],
          ...profile
        };
      } else {
        db.users.push({
          userId,
          ...profile
        });
      }
      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, profile: profile }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/user/profile", "POST", { userId, profile });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
