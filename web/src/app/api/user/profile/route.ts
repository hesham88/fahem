import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { verifyAuth } from "../../_auth";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../../localDbHelper";

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
    const username = searchParams.get("username");
    const email = searchParams.get("email");

    // If no specific identifier is provided, default to the authenticated user's profile
    if (!userId && !username && !email) {
      userId = ctx.uid;
    }

    // IDOR Protection: Standard users can only fetch their own profile.
    const isSelf = 
      (userId && userId === ctx.uid) ||
      (email && email.toLowerCase().trim() === ctx.email?.toLowerCase().trim());
    
    const isAdmin = ctx.role === "admin" || ctx.role === "super-admin";

    if (!isSelf && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: You do not have permission to view this profile" }), {
        status: 403,
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

    return await proxyRequest(`/user/profile?${params.toString()}`, "GET", undefined, ctx);
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
    const { profile } = body;
    let targetUserId = body.userId;

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile content is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const isAdmin = ctx.role === "admin" || ctx.role === "super-admin";
    const isSuper = ctx.role === "super-admin";

    // Enforce target user ownership
    if (!targetUserId || !isAdmin) {
      targetUserId = ctx.uid; // Normal users can only write to their own profile
    }

    // Determine if requester is an admin that requires superadmin approval to modify another user's profile
    let needsApproval = false;
    if (targetUserId !== ctx.uid) {
      // Standard admin modifying another profile requires superadmin approval
      needsApproval = isAdmin && !isSuper;
    }

    if (needsApproval) {
      // Append request to admin_change_requests
      const db = getLocalDb();
      const requestId = "req_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
      const changeRequest = {
        id: requestId,
        requesterEmail: ctx.email,
        actionType: "update_user_profile",
        payload: { userId: targetUserId, profile },
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
      const idx = db.users.findIndex(u => u.userId === targetUserId);
      if (idx >= 0) {
        db.users[idx] = {
          ...db.users[idx],
          ...profile,
          userId: targetUserId // Ensure userId is never mutated
        };
      } else {
        db.users.push({
          userId: targetUserId,
          ...profile
        });
      }
      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, profile: profile }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/user/profile", "POST", { userId: targetUserId, profile }, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

