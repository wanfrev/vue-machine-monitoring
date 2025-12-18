self.addEventListener("push", function (event) {
  console.log("[SW] push event received", event);
  let data = null;

  try {
    if (event.data) {
      data = event.data.json();
      console.log("[SW] parsed push data:", data);
    }
  } catch (e) {
    console.error("[SW] error parsing push data:", e);
  }

  // If there's no payload, try to fetch latest events from the backend
  const fetchFallback = async () => {
    try {
      const resp = await fetch("/api/iot/events/latest");
      if (!resp.ok) throw new Error("fetch events failed " + resp.status);
      const json = await resp.json();
      const coin = json.event;
      if (coin) {
        return {
          title: "Moneda ingresada",
          body:
            coin.data && coin.data.cantidad
              ? `Máquina ${coin.machine_id} recibió ${coin.data.cantidad} moneda(s)`
              : `Máquina ${coin.machine_id} registró una moneda`,
          data: coin,
        };
      }
    } catch (err) {
      console.error("[SW] fallback fetch error", err);
    }
    return null;
  };

  const show = async (payload) => {
    const title = payload.title || "MachineHub";
    const options = {
      body: payload.body || "",
      data: payload.data || {},
      icon: "/img/icons/K11BOX.webp",
      badge: "/img/icons/K11BOX.webp",
      vibrate: [100, 50, 100],
      renotify: true,
      tag: "machinehub-coin",
      requireInteraction: false,
    };
    console.log("[SW] showing notification", title, options);
    // Notify open window clients so they can play a sound if appropriate
    try {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        try {
          client.postMessage({
            type: "coin_notification",
            payload: options.data || {},
          });
        } catch (e) {
          console.warn("[SW] client.postMessage failed", e);
        }
      }
    } catch (e) {
      console.warn("[SW] notify clients failed", e);
    }

    return self.registration.showNotification(title, options);
  };

  event.waitUntil(
    (async () => {
      if (data && (data.title || data.body)) {
        return show(data);
      }

      // try fallback fetch
      const fallback = await fetchFallback();
      if (fallback) return show(fallback);

      // last resort: show a generic notification
      return show({
        title: "MachineHub",
        body: "Tiene un nuevo evento en segundo plano",
      });
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
