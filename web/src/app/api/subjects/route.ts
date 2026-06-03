import { NextRequest } from "next/server";
import { MongoClient } from "mongodb";
import { checkIsAdmin } from "../admin/helper";
import { proxyRequest } from "../proxy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
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

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      return new Response(JSON.stringify({ error: "MONGODB_URI is not set" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db("fahem");

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

    await db.collection("subjects").insertOne(newSubject as any);
    await client.close();

    return new Response(JSON.stringify({ success: true, subject: newSubject }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[api-subjects-post] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
