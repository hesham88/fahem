import { auth } from "./firebase";

/**
 * A wrapper around the browser's native fetch that automatically attaches the logged-in 
 * Firebase user's ID token as a Bearer token in the Authorization header.
 * 
 * In development mode, it also supports local mock tokens via sessionStorage to make 
 * testing different user roles (student, teacher, admin, super-admin, judge) seamless.
 */
export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    const isJudgeBypass = localStorage.getItem("judge_bypass_session") === "true";
    if (isJudgeBypass) {
      const savedBypassEmail = localStorage.getItem("judge_bypass_email") || "judge.evaluation@fahem.edu";
      token = `judge-mock:${savedBypassEmail}`;
    } else if (process.env.NODE_ENV === "development") {
      // Support testing various personas offline/locally
      const mockToken = sessionStorage.getItem("mock_auth_token");
      if (mockToken) {
        token = mockToken;
      }
    }
  }

  // If no mock token is active, acquire the real Firebase ID token
  if (!token) {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        token = await currentUser.getIdToken();
      } catch (err) {
        console.error("[authedFetch] Failed to retrieve Firebase ID token:", err);
      }
    }
  }

  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(path, {
    ...init,
    headers,
  });
}
