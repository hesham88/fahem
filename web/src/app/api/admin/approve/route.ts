import { NextRequest } from "next/server";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../../localDbHelper";
import { proxyRequest } from "../../proxy";

export const dynamic = "force-dynamic";

function getSuperadmins(): string[] {
  let raw = process.env.SUPERADMIN_USER || "";
  // Strip outer quotes if any (common in Secret Manager values)
  raw = raw.trim().replace(/^['"]|['"]$/g, "");
  const envSuperadmins = raw
    ? raw.split(",").map((addr) => addr.trim().toLowerCase().replace(/^['"]|['"]$/g, ""))
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
    const proxyRes = await proxyRequest("/admin/approve", "GET");
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
    const proxyRes = await proxyRequest("/admin/approve", "POST", { adminEmail, action });
    return proxyRes;

  } catch (err: any) {
    console.error("[admin-approve-api] POST failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
