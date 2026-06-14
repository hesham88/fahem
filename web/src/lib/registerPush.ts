// Browser push registration (Web-Push / VAPID). Fully graceful: it no-ops when the
// browser is unsupported, permission is denied, or no VAPID public key is configured
// on the server — so it can never break the app.

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerPushNotifications(
  authedFetch: (url: string, opts?: any) => Promise<Response>
): Promise<void> {
  try {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;

    // 1. Get the server VAPID public key; if unset, push isn't configured yet — stop.
    const keyRes = await authedFetch("/api/user/push-public-key");
    if (!keyRes.ok) return;
    const keyData = await keyRes.json();
    const publicKey = keyData && keyData.publicKey;
    if (!publicKey) return;

    // 2. Permission (do not nag if already decided).
    if (Notification.permission === "denied") return;
    if (Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;
    }

    // 3. Register the push-only service worker and subscribe.
    const reg = await navigator.serviceWorker.register("/fahem-push-sw.js");
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });
    }

    // 4. Send the subscription to the backend (idempotent upsert).
    await authedFetch("/api/user/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
  } catch (err) {
    console.warn("[push] registration skipped:", err);
  }
}
