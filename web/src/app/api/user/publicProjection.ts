// FC8 — Public member projection.
//
// The social directory (/api/user/directory) and the public profile page
// (/api/user/profile viewed by a non-owner, non-admin) expose members to every
// authenticated user so they can discover classmates, add friends, and DM. That
// audience must NOT receive PII (email, phone, parent email) or any internal /
// security / rate-limit bookkeeping. This is a strict allow-list: anything not
// named here is dropped, so a newly-added sensitive field never leaks by default.

const PUBLIC_FIELDS = [
  "userId",
  "username",
  "name",
  "avatar",
  "userType",
  "role",
  "school",
  "country",
  "grade",
  "age",
  "onboardingCompleted",
  "isApproved",
  "createdAt",
  "friends",
] as const;

/** Returns a PII-free copy of a user document safe to show to other members. */
export function toPublicProfile(user: any): any {
  if (!user || typeof user !== "object") return user;
  const out: Record<string, any> = {};
  for (const key of PUBLIC_FIELDS) {
    if (user[key] !== undefined) out[key] = user[key];
  }
  return out;
}
