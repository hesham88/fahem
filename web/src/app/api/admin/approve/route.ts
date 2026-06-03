import { NextRequest } from "next/server";
import { MongoClient } from "mongodb";

export const dynamic = "force-dynamic";

function getSuperadmins(): string[] {
  const envSuperadmins = process.env.SUPERADMIN_USER
    ? process.env.SUPERADMIN_USER.split(",").map((addr) => addr.trim().toLowerCase())
    : [];
  return envSuperadmins;
}

// GET: Retrieve list of all administrators and standard users with role "admin"
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const superadminEmail = searchParams.get("superadminEmail")?.toLowerCase().trim();

    if (!superadminEmail) {
      return new Response(JSON.stringify({ error: "Superadmin email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const superadmins = getSuperadmins();
    if (!superadmins.includes(superadminEmail)) {
      return new Response(JSON.stringify({ error: "Access Denied: Requester is not an authorized superadmin." }), {
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

    // Fetch users with role admin, as well as anyone already in the admins collection
    const users = await db.collection("users").find({ role: "admin" }).toArray();
    const admins = await db.collection("admins").find({}).toArray();

    await client.close();

    // Map and merge results
    const adminMap = new Map<string, any>();

    // Seed with database admins collection
    admins.forEach((adm) => {
      adminMap.set(adm.email.toLowerCase().trim(), {
        email: adm.email,
        name: adm.name || "Approved Admin",
        role: "admin",
        isApprovedAdmin: adm.isApprovedAdmin === true,
        source: "admins_collection"
      });
    });

    // Merge/override with users collection data
    users.forEach((usr) => {
      const emailKey = usr.email.toLowerCase().trim();
      const existing = adminMap.get(emailKey);
      adminMap.set(emailKey, {
        email: usr.email,
        name: usr.name || usr.username || "Admin Candidate",
        role: "admin",
        isApprovedAdmin: usr.isApprovedAdmin === true || existing?.isApprovedAdmin === true,
        source: "users_collection",
        userId: usr.userId
      });
    });

    const mergedList = Array.from(adminMap.values());

    return new Response(JSON.stringify({ success: true, admins: mergedList }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[admin-approve-api] GET failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// POST: Approve or Revoke an administrator candidate
export async function POST(req: NextRequest) {
  try {
    const { superadminEmail, adminEmail, action } = await req.json();

    if (!superadminEmail || !adminEmail || !action) {
      return new Response(JSON.stringify({ error: "Missing required parameters: superadminEmail, adminEmail, action" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const superadmins = getSuperadmins();
    const cleanSuperadmin = superadminEmail.toLowerCase().trim();
    const cleanAdmin = adminEmail.toLowerCase().trim();

    if (!superadmins.includes(cleanSuperadmin)) {
      return new Response(JSON.stringify({ error: "Access Denied: Requester is not an authorized superadmin." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Protect superadmins from being revoked or altered via this endpoint
    if (superadmins.includes(cleanAdmin)) {
      return new Response(JSON.stringify({ error: "Access Denied: Cannot modify superadmin status from database admin controls." }), {
        status: 400,
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

    const isApproved = action === "approve";

    // 1. Update users collection if they exist
    await db.collection("users").updateOne(
      { email: cleanAdmin },
      { $set: { isApprovedAdmin: isApproved } }
    );

    // 2. Update or upsert admins collection
    await db.collection("admins").updateOne(
      { email: cleanAdmin },
      { $set: { email: cleanAdmin, isApprovedAdmin: isApproved, name: adminEmail.split("@")[0] } },
      { upsert: true }
    );

    await client.close();

    return new Response(JSON.stringify({ success: true, message: `Successfully ${isApproved ? "approved" : "revoked"} admin ${cleanAdmin}` }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[admin-approve-api] POST failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
