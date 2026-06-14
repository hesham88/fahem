import { test, expect } from "@playwright/test";

/**
 * End-to-end push test — the browser-receipt leg.
 *
 * Registers the production push service worker on the live origin, then uses the
 * Chrome DevTools Protocol (ServiceWorker.deliverPushMessage) to deliver a simulated
 * push WITHOUT going through FCM, and asserts the service worker processed it (it
 * shows the OS notification and postMessages open tabs — we assert the postMessage).
 *
 * Run: cd web && npx playwright test e2e/push_cdp.spec.ts
 * (Targets PLAYWRIGHT_TEST_BASE_URL, default https://fahem.pro — needs the SW deployed.)
 */

const ORIGIN = (process.env.PLAYWRIGHT_TEST_BASE_URL || "https://fahem.pro").replace(/\/$/, "");

test("push delivered via CDP reaches the service worker", async ({ page, context }) => {
  await context.grantPermissions(["notifications"], { origin: ORIGIN });

  await page.goto("/");

  // Register the push-only service worker and wait until it is active.
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.register("/fahem-push-sw.js");
    await navigator.serviceWorker.ready;
    return reg.scope;
  });

  // Discover the service worker registrationId via CDP.
  const cdp = await context.newCDPSession(page);
  let registrationId = "";
  cdp.on("ServiceWorker.workerRegistrationUpdated", (ev: any) => {
    for (const r of ev.registrations || []) {
      if (r.scopeURL && r.scopeURL.startsWith(ORIGIN)) registrationId = r.registrationId;
    }
  });
  await cdp.send("ServiceWorker.enable");
  await expect.poll(() => registrationId, { timeout: 10000 }).not.toEqual("");

  // Arm a listener for the SW -> page push message.
  const received = page.evaluate(
    () =>
      new Promise<any>((resolve) => {
        navigator.serviceWorker.addEventListener("message", (e: any) => {
          if (e.data && e.data.type === "push") resolve(e.data);
        });
        setTimeout(() => resolve(null), 10000);
      })
  );

  // Deliver a simulated push through CDP (no FCM round-trip).
  const payload = { title: "Fahem CDP Test", body: "end-to-end push", url: "/?tab=library" };
  await cdp.send("ServiceWorker.deliverPushMessage", {
    origin: ORIGIN,
    registrationId,
    data: JSON.stringify(payload),
  });

  const msg = await received;
  expect(msg, "the page received the push forwarded by the service worker").toBeTruthy();
  expect(msg.title).toBe(payload.title);
  expect(msg.body).toBe(payload.body);
});
