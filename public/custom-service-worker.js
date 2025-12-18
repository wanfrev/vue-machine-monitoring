self.addEventListener("push", function (event) {
  console.log("[SW] push event received", event);
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
    console.log("[SW] parsed push data:", data);
  } catch (e) {
    data = { title: "Notificación", body: event.data ? event.data.text() : "" };
    console.error("[SW] error parsing push data, using text fallback:", e);
  }

  const title = data.title || "MachineHub";
  const options = {
    body: data.body || "",
    data: data.data || {},
    icon: "/img/icons/K11BOX.webp",
    badge: "/img/icons/K11BOX.webp",
  };

  event.waitUntil(
    (async () => {
      console.log("[SW] showing notification", title, options);
      return self.registration.showNotification(title, options);
    })()
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
