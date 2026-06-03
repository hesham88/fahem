import { NextRequest } from "next/server";
import { checkIsAdmin } from "../admin/helper";
import { proxyRequest } from "../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../localDbHelper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (isLocalEnv()) {
      const db = getLocalDb();
      return new Response(JSON.stringify({ success: true, subjects: db.subjects }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return await proxyRequest("/user/subjects", "GET");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, name_ar, grade_level, category, icon_emoji, requesterEmail } = await req.json();

    if (!requesterEmail || !name || !name_ar) {
      return new Response(JSON.stringify({ error: "Missing required fields: requesterEmail, name, name_ar" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Verify requester is admin/superadmin
    const isAdmin = await checkIsAdmin(requesterEmail);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Access Denied: Requester is not an authorized administrator." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 1. Local environment check
    if (isLocalEnv()) {
      const db = getLocalDb();
      const subjectId = "sub_" + name.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
      const newSubject = {
        _id: subjectId,
        name,
        name_ar,
        grade_level: grade_level || "General",
        category: category || "Science",
        icon_emoji: icon_emoji || "📚",
        books_count: 0
      };
      db.subjects.push(newSubject);
      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, subject: newSubject }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Production: Proxy to Cloud Run Agent
    return await proxyRequest("/user/subjects", "POST", {
      name,
      name_ar,
      grade_level,
      category,
      icon_emoji
    });

  } catch (err: any) {
    console.error("[api-subjects-post] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
