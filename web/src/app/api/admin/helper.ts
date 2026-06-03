import { MongoClient } from "mongodb";

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
  const envSuperadmins = process.env.SUPERADMIN_USER
    ? process.env.SUPERADMIN_USER.split(",").map((addr) => addr.trim().toLowerCase())
    : [];
  
  if (envSuperadmins.includes(normalizedEmail)) {
    return true; // Bypasses DB lookup completely!
  }

  // 2. Standard approved admins (Stored in MongoDB with `isApprovedAdmin === true`)
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[admin-auth-helper] MONGODB_URI is not set. Bypassing database admin check.");
    return false;
  }

  let client: MongoClient | null = null;
  try {
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db("fahem");

    // Check "users" collection
    const userDoc = await db.collection("users").findOne({
      email: normalizedEmail,
      isApprovedAdmin: true
    });
    if (userDoc) return true;

    // Check dedicated "admins" collection
    const adminDoc = await db.collection("admins").findOne({
      email: normalizedEmail,
      isApprovedAdmin: true
    });
    return !!adminDoc;

  } catch (err) {
    console.error("[admin-auth-helper] Failed to verify admin status via MongoDB:", err);
    return false;
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
}
