// Fahem push service worker — push delivery only (no fetch/caching handler,
// so it never interferes with page loading or the app's network behaviour).

self.addEventListener("push", function (event) {
  let data = { title: "Fahem", body: "", url: "/" };
  try {
    if (event.data) data = Object.assign(data, event.data.json());
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }
  const options = {
    body: data.body || "",
    icon: "/brand/logo_compressed.png",
    badge: "/brand/logo_compressed.png",
    data: { url: data.url || "/" },
  };
  // Show the OS notification AND notify any open tab so it can refresh its bell in
  // real time. The postMessage also lets the E2E (CDP) test assert receipt.
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || "Fahem", options),
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) {
        cs.forEach(function (c) {
          c.postMessage({ type: "push", title: data.title || "Fahem", body: data.body || "", url: data.url || "/" });
        });
      }),
    ])
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client && target && target !== "/") {
            try { client.navigate(target); } catch (e) { /* ignore */ }
          }
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
