import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../../localDbHelper";
import { requireUser } from "../../_auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    if (isLocalEnv()) {
      const db = getLocalDb();
      return new Response(JSON.stringify({ success: true, groups: db.social_groups || [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return await proxyRequest("/social/groups", "GET", undefined, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const { name, name_ar, description, description_ar, category, emoji } = await req.json();

    if (!name || !name_ar) {
      return new Response(JSON.stringify({ error: "Missing required fields: name, name_ar" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Force creator userId to be the authenticated user uid
    const userId = ctx.uid;

    if (isLocalEnv()) {
      const db = getLocalDb();
      const groupId = "group_" + Date.now();
      const newGroup = {
        _id: groupId,
        name,
        name_ar,
        description: description || "",
        description_ar: description_ar || "",
        category: category || "General",
        emoji: emoji || "👥",
        members_count: 1,
        created_by: userId
      };
      if (!db.social_groups) db.social_groups = [];
      db.social_groups.push(newGroup);
      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, group: newGroup }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Proxy to Cloud Run Agent
    return await proxyRequest("/social/groups", "POST", {
      name,
      name_ar,
      description,
      description_ar,
      category,
      emoji,
      userId
    }, ctx);

  } catch (err: any) {
    console.error("[api-social-groups-post] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

