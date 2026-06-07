import { NextRequest } from "next/server";
import { requireSuperadmin } from "../../_auth";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../../localDbHelper";
import { proxyRequest } from "../../proxy";

export const dynamic = "force-dynamic";

// GET: Fetch pending change requests for Superadmin Audit Trail
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSuperadmin(req);
    if (ctx instanceof Response) return ctx;

    if (isLocalEnv()) {
      const db = getLocalDb();
      const pendingRequests = (db.admin_change_requests || []).filter(r => r.status === "pending");
      return new Response(JSON.stringify({ success: true, requests: pendingRequests }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // In production, we proxy to Cloud Run Agent or fallback to local DB tracking
    try {
      const proxyRes = await proxyRequest("/admin/approve-changes", "GET", undefined, ctx);
      if (proxyRes.ok) {
        return proxyRes;
      }
    } catch (err) {
      console.warn("[approve-changes-api] Proxy failed, falling back to local DB", err);
    }

    const db = getLocalDb();
    const pendingRequests = (db.admin_change_requests || []).filter(r => r.status === "pending");
    return new Response(JSON.stringify({ success: true, requests: pendingRequests }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[approve-changes-api GET] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// POST: Approve or reject an admin's change request
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSuperadmin(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const { requestId, action } = body;

    if (!requestId || !action) {
      return new Response(JSON.stringify({ error: "Missing required parameters: requestId, action" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      const requests = db.admin_change_requests || [];
      const idx = requests.findIndex(r => r.id === requestId);

      if (idx < 0) {
        return new Response(JSON.stringify({ error: "Change request not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      const request = requests[idx];
      if (request.status !== "pending") {
        return new Response(JSON.stringify({ error: "Request is already processed" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      request.status = action === "approve" ? "approved" : "denied";

      if (action === "approve") {
        // Execute the change request payload
        const { actionType, payload } = request;

        if (actionType === "create_subject") {
          const subjectId = "sub_" + payload.name.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
          const newSubject = {
            _id: subjectId,
            name: payload.name,
            name_ar: payload.name_ar,
            grade_level: payload.grade_level || "General",
            category: payload.category || "Science",
            icon_emoji: payload.icon_emoji || "📚",
            emoji: payload.icon_emoji || "📚",
            books_count: 0
          };
          db.subjects.push(newSubject);
        } else if (actionType === "update_subject") {
          const sIdx = db.subjects.findIndex(s => s._id === payload.id);
          if (sIdx >= 0) {
            db.subjects[sIdx] = {
              ...db.subjects[sIdx],
              name: payload.name,
              name_ar: payload.name_ar,
              grade_level: payload.grade_level || db.subjects[sIdx].grade_level,
              category: payload.category || db.subjects[sIdx].category,
              icon_emoji: payload.icon_emoji || db.subjects[sIdx].icon_emoji,
              emoji: payload.icon_emoji || db.subjects[sIdx].emoji
            };
          }
        } else if (actionType === "update_config") {
          db.config = {
            isTokenControlActive: payload.isTokenControlActive !== undefined ? !!payload.isTokenControlActive : true,
            weeklyAllocationLimit: Number(payload.weeklyAllocationLimit) || 250000,
            monthlyAllocationLimit: Number(payload.monthlyAllocationLimit) || 1000000,
            maxUploadSize: Number(payload.maxUploadSize) || 2
          };
        } else if (actionType === "update_user_profile") {
          const uIdx = (db.users || []).findIndex(u => u.userId === payload.userId);
          if (uIdx >= 0) {
            db.users![uIdx] = {
              ...(db.users![uIdx]),
              ...payload.profile
            };
          } else {
            // Add user if missing locally
            db.users = db.users || [];
            db.users.push({
              userId: payload.userId,
              ...payload.profile
            });
          }
        } else if (actionType === "delete_subject") {
          db.subjects = db.subjects.filter(s => s._id !== payload.id);
          db.books = db.books.filter(b => b.subject_id !== payload.id);
        }
      }

      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, message: `Successfully ${action}d change request.` }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // In production, we proxy or fallback
    try {
      const proxyRes = await proxyRequest("/admin/approve-changes", "POST", { requestId, action }, ctx);
      if (proxyRes.ok) {
        return proxyRes;
      }
    } catch (err) {
      console.warn("[approve-changes-api] Proxy POST failed, falling back to local DB write", err);
    }

    // Local DB write in production fallback
    const db = getLocalDb();
    const requests = db.admin_change_requests || [];
    const idx = requests.findIndex(r => r.id === requestId);

    if (idx >= 0) {
      const request = requests[idx];
      request.status = action === "approve" ? "approved" : "denied";
      // Perform fallback execute
      if (action === "approve") {
        const { actionType, payload } = request;
        if (actionType === "create_subject") {
          db.subjects.push({
            _id: "sub_" + Date.now(),
            name: payload.name,
            name_ar: payload.name_ar,
            grade_level: payload.grade_level || "General",
            category: payload.category || "Science",
            icon_emoji: payload.icon_emoji || "📚",
            emoji: payload.icon_emoji || "📚",
            books_count: 0
          });
        } else if (actionType === "update_subject") {
          const sIdx = db.subjects.findIndex(s => s._id === payload.id);
          if (sIdx >= 0) {
            db.subjects[sIdx] = {
              ...db.subjects[sIdx],
              name: payload.name,
              name_ar: payload.name_ar,
              grade_level: payload.grade_level || db.subjects[sIdx].grade_level,
              category: payload.category || db.subjects[sIdx].category,
              icon_emoji: payload.icon_emoji || db.subjects[sIdx].icon_emoji,
              emoji: payload.icon_emoji || db.subjects[sIdx].emoji
            };
          }
        } else if (actionType === "update_config") {
          db.config = payload;
        } else if (actionType === "update_user_profile") {
          const uIdx = (db.users || []).findIndex(u => u.userId === payload.userId);
          if (uIdx >= 0) db.users![uIdx] = { ...db.users![uIdx], ...payload.profile };
        } else if (actionType === "delete_subject") {
          db.subjects = db.subjects.filter(s => s._id !== payload.id);
          db.books = db.books.filter(b => b.subject_id !== payload.id);
        }
      }
      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, message: `Successfully ${action}d change request (Local Fallback).` }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Change request not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[approve-changes-api POST] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
