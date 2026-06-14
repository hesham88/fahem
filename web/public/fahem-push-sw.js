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
  event.waitUntil(self.registration.showNotification(data.title || "Fahem", options));
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
