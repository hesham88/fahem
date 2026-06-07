import { proxyRequest } from "../proxy";

export async function checkFocusLockProd(uid: string, role: string): Promise<any> {
  if (role !== "student" && role !== "user") {
    return { locked: false };
  }
  
  try {
    const res = await proxyRequest("/assignments/focus-lock", "GET", undefined, { uid, role });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.error("checkFocusLockProd error:", err);
  }
  return { locked: false };
}
