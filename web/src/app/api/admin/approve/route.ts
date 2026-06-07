import { NextRequest } from "next/server";
import { requireSuperadmin } from "../../_auth";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../../localDbHelper";
import { proxyRequest } from "../../proxy";

export const dynamic = "force-dynamic";

// GET: Retrieve list of all administrators and standard users with role "admin"
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSuperadmin(req);
    if (ctx instanceof Response) return ctx;

    // 1. Local environment check
    if (isLocalEnv()) {
      const db = getLocalDb();
      
      // Proactively clean up Anas Al-Sayed / admin.candidate@fahem.edu
      db.admins = (db.admins || []).filter(adm => 
        adm.email.toLowerCase().trim() !== "admin.candidate@fahem.edu" &&
        !(adm.name && adm.name.toLowerCase().includes("anas"))
      );

      // Seed Seba Freediving as pending admin candidate
      const hasSeba = db.admins.some(adm => adm.email.toLowerCase().trim() === "sebafreediving@gmail.com");
      if (!hasSeba) {
        db.admins.push({
          email: "sebafreediving@gmail.com",
          name: "Seba Freediving",
          isApprovedAdmin: false
        });
      }

      saveLocalDb(db);

      // Ensure all admins have role admin
      const localAdmins = db.admins.map(adm => ({
        email: adm.email,
        name: adm.name || "Approved Admin",
        role: "admin",
        isApprovedAdmin: adm.isApprovedAdmin === true,
        source: "local_db"
      }));
      return new Response(JSON.stringify({ success: true, admins: localAdmins }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Production: Proxy to GCP Agent
    const proxyRes = await proxyRequest("/admin/approve", "GET", undefined, ctx);
    return proxyRes;

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
    const ctx = await requireSuperadmin(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const { adminEmail, action } = body;

    if (!adminEmail || !action) {
      return new Response(JSON.stringify({ error: "Missing required parameters: adminEmail, action" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const cleanAdmin = adminEmail.toLowerCase().trim();

    // Protect superadmins from being revoked or altered via this endpoint
    if (ctx.email && cleanAdmin === ctx.email.toLowerCase().trim()) {
      return new Response(JSON.stringify({ error: "Access Denied: Cannot modify your own superadmin status." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 1. Local environment check
    if (isLocalEnv()) {
      const db = getLocalDb();
      const isApproved = action === "approve";
      
      const existingIndex = db.admins.findIndex(adm => adm.email.toLowerCase().trim() === cleanAdmin);
      if (existingIndex >= 0) {
        db.admins[existingIndex].isApprovedAdmin = isApproved;
      } else {
        db.admins.push({
          email: adminEmail,
          name: adminEmail.split("@")[0],
          isApprovedAdmin: isApproved
        });
      }
      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, message: `Successfully ${isApproved ? "approved" : "revoked"} admin ${cleanAdmin} (Local DB)` }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Production: Proxy to GCP Agent
    const proxyRes = await proxyRequest("/admin/approve", "POST", { adminEmail, action }, ctx);
    return proxyRes;

  } catch (err: any) {
    console.error("[admin-approve-api] POST failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
