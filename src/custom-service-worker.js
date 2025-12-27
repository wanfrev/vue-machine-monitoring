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
        // If the event type is unknown, do not generate a generic notification
        // to avoid duplicate or misleading notifications on clients.
        return null;
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

    // If payload includes a timestamp in data, append a localized time
    // string to the body so the notification shows the event time.
    try {
      const ts = options.data && (options.data.timestamp || options.data.ts);
      if (ts) {
        let d;
        try {
          d = new Date(ts);
          if (Number.isNaN(d.getTime())) d = null;
        } catch (e) {
          d = null;
        }
        if (d) {
          try {
            const timeStr = d.toLocaleString("es-VE", {
              timeZone: "America/Caracas",
            });
            if (options.body && !options.body.includes(timeStr)) {
              options.body = `${options.body} • ${timeStr}`;
            } else if (!options.body) {
              options.body = timeStr;
            }
          } catch (e) {
            // ignore formatting errors
          }
        }
      }
    } catch (e) {
      // ignore any errors
    }
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

      // If we couldn't obtain a payload or fallback event, do not show any
      // generic notification to avoid spurious "Nuevo evento" alerts.
      return;
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

// Listen for messages from the page (e.g., SKIP_WAITING)
self.addEventListener("message", (event) => {
  try {
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "SKIP_WAITING") {
      // Activate this SW immediately
      self.skipWaiting();
    }
  } catch (e) {
    /* ignore */
  }
});
