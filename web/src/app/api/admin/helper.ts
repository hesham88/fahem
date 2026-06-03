import { isLocalEnv, getLocalDb } from "../localDbHelper";
import { proxyRequest } from "../proxy";

/**
 * Checks if an email is an authorized administrator (either a superadmin from environment secrets
 * or an approved admin stored in MongoDB with the isApprovedAdmin flag).
 * 
 * - Superadmins require no database lookups and cannot be removed except by modifying the environment secret.
 * - Standard admins are approved by superadmins and verified dynamically via MongoDB.
 */
export async function checkIsAdmin(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Superadmin validation (Gated purely via process.env.SUPERADMIN_USER)
  let raw = process.env.SUPERADMIN_USER || "";
  // Strip outer quotes if any (common in Secret Manager values)
  raw = raw.trim().replace(/^['"]|['"]$/g, "");
  const envSuperadmins = raw
    ? raw.split(",").map((addr) => addr.trim().toLowerCase().replace(/^['"]|['"]$/g, ""))
    : [];
  
  if (envSuperadmins.includes(normalizedEmail)) {
    return true; // Bypasses DB lookup completely!
  }

  // 2. Local fallback for local development testing
  if (isLocalEnv()) {
    const db = getLocalDb();
    const isApproved = db.admins.some(
      (adm) => adm.email.toLowerCase().trim() === normalizedEmail && adm.isApprovedAdmin === true
    );
    return isApproved;
  }

  // 3. Standard approved admins (Stored in MongoDB with `isApprovedAdmin === true`) - Proxied to Agent
  try {
    const response = await proxyRequest(`/admin/check?email=${encodeURIComponent(normalizedEmail)}`, "GET");
    if (response.ok) {
      const data = await response.json();
      return data.isAdmin === true;
    }
    return false;
  } catch (err) {
    console.error("[admin-auth-helper] Failed to verify admin status via proxy:", err);
    return false;
  }
}
