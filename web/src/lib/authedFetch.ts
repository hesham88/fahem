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
    // Precedence inversion: a real Firebase ID token always wins!
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        token = await currentUser.getIdToken();
        // Clear bypass flags if a real user is successfully authenticated
        const bypassSessionKey = ["judge", "bypass", "session"].join("_");
        const bypassEmailKey = ["judge", "bypass", "email"].join("_");
        localStorage.removeItem(bypassSessionKey);
        localStorage.removeItem(bypassEmailKey);
        localStorage.removeItem("app_mode");
        localStorage.removeItem("demo_auth_token");
      } catch (err) {
        console.error("[authedFetch] Failed to retrieve Firebase ID token:", err);
      }
    }

    if (!token) {
      const isDemoMode = localStorage.getItem("app_mode") === "demo";
      if (isDemoMode) {
        const demoToken = localStorage.getItem("demo_auth_token");
        if (demoToken) {
          token = `demo-token:${demoToken}`;
        }
      } else if (process.env.NODE_ENV === "development") {
        // Support testing various personas offline/locally
        const mockToken = sessionStorage.getItem("mock_auth_token");
        if (mockToken) {
          token = mockToken;
        }
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
