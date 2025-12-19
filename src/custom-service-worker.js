import { precacheAndRoute } from "workbox-precaching";

// Injected manifest will be placed into self.__WB_MANIFEST by Workbox InjectManifest
precacheAndRoute(self.__WB_MANIFEST || []);

/* eslint-env serviceworker */

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
      const resp = await fetch("/api/iot/events");
      if (!resp.ok) throw new Error("fetch events failed " + resp.status);
      const json = await resp.json();
      const ev = Array.isArray(json.events) ? json.events[0] : json.event;
      if (ev) {
        // Normalize payload for different event types
        if (ev.type === "coin_inserted") {
          return {
            title: "Moneda ingresada",
            body:
              ev.data && ev.data.cantidad
                ? `Máquina ${ev.machine_id} recibió ${ev.data.cantidad} moneda(s)`
                : `Máquina ${ev.machine_id} registró una moneda`,
            data: ev,
          };
        }
        if (ev.type === "machine_on" || ev.type === "machine_off") {
          return {
            title:
              ev.type === "machine_on"
                ? "Máquina encendida"
                : "Máquina apagada",
            body: `${ev.machine_id}${
              ev.data && ev.data.reason ? ` — ${ev.data.reason}` : ""
            }`,
            data: { ...ev, eventType: ev.type },
          };
        }
        return {
          title: "Nuevo evento",
          body: `Evento ${ev.type} en ${ev.machine_id}`,
          data: ev,
        };
      }
    } catch (err) {
      console.error("[SW] fallback fetch error", err);
    }
    return null;
  };

  const show = async (payload) => {
    const title = payload.title || "MachineHub";
    const eventType =
      (payload.data && (payload.data.eventType || payload.data.type)) || null;
    const vibrate =
      eventType === "machine_off" ? [300, 100, 300] : [100, 50, 100];
    const requireInteraction = eventType === "machine_off";
    const tag = `machinehub-${eventType || "event"}`;
    const options = {
      body: payload.body || "",
      data: payload.data || {},
      icon: "/img/icons/K11BOX.webp",
      badge: "/img/icons/K11BOX.webp",
      vibrate,
      renotify: true,
      tag,
      requireInteraction,
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
            type: "event_notification",
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
