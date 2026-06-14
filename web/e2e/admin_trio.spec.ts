import { test, expect } from "@playwright/test";

/**
 * E2E for the admin-surface trio (FC6.7 demo monitor, FC6.10 approval console, FC6.8 sandbox
 * catalogue). Hits the live Cloud Run agent with an owner OIDC token + a sandbox principal and
 * asserts the data plane. Skips gracefully when local Google ADC is unavailable (e.g. plain CI).
 *
 * Run: cd web && npx playwright test e2e/admin_trio.spec.ts
 */

const AGENT_URL = process.env.FAHEM_AGENT_URL || "https://fahem-agent-sbqsl5tfga-uk.a.run.app";

async function ownerHeaders(): Promise<Record<string, string> | null> {
  try {
    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(AGENT_URL);
    const h = await client.getRequestHeaders(AGENT_URL);
    const headers: Record<string, string> = {};
    // getRequestHeaders may return a Headers-like object across versions.
    if (typeof (h as any).forEach === "function") {
      (h as any).forEach((v: string, k: string) => (headers[k] = v));
    } else {
      Object.assign(headers, h);
    }
    headers["X-Verified-Principal"] = JSON.stringify({ // guard:allow-principal (e2e harness)
      uid: "fDtKpvuKYuSgB3km8DRTRgOU3RH3",
      email: "hesham1988@gmail.com",
      role: "super-admin",
      db_target: "fahem_sandbox",
    });
    headers["Content-Type"] = "application/json";
    if (!headers["Authorization"] && !headers["authorization"]) return null;
    return headers;
  } catch {
    return null;
  }
}

test.describe("admin-surface trio", () => {
  test("FC6.7 demo monitor lists sandbox sessions", async ({ request }) => {
    const headers = await ownerHeaders();
    test.skip(!headers, "Google ADC not available for the live e2e");
    const res = await request.get(`${AGENT_URL}/admin/demo-sessions`, { headers: headers! });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.success).toBeTruthy();
    expect(Array.isArray(data.sessions)).toBeTruthy();
  });

  test("FC6.10 approval console shows real data (no hardcoded sebafreediving)", async ({ request }) => {
    const headers = await ownerHeaders();
    test.skip(!headers, "Google ADC not available for the live e2e");
    const res = await request.get(`${AGENT_URL}/admin/approve`, { headers: headers! });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.success).toBeTruthy();
    const admins = data.admins || [];
    // Every entry must come from real data, not the old hardcoded injection.
    for (const a of admins) {
      expect(["users_collection", "admins_collection"]).toContain(a.source);
    }
    const hardcodedSeba = admins.find(
      (a: any) => (a.email || "").includes("sebafreediving") && a.source !== "users_collection"
    );
    // seba may only appear if it is genuinely an admin user in the DB, never as a hardcoded stub.
    expect(hardcodedSeba?.name === "Seba Freediving" && hardcodedSeba?.isApprovedAdmin === false).toBeFalsy();
  });

  test("FC6.8 sandbox catalogue reads the sandbox DB", async ({ request }) => {
    const headers = await ownerHeaders();
    test.skip(!headers, "Google ADC not available for the live e2e");
    const res = await request.get(`${AGENT_URL}/user/libraries`, { headers: headers! });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.success).toBeTruthy();
    expect(Array.isArray(data.libraries)).toBeTruthy();
  });
});
