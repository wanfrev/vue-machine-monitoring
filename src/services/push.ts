/* eslint-disable */
import { savePushSubscription, getVapidPublicKey } from "@/api/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
    // Ensure service worker is registered (register in dev if needed)
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      try {
        registration = await navigator.serviceWorker.register(
          "/custom-service-worker.js"
        );
      } catch (regErr) {
        console.warn("Failed to register service worker for push:", regErr);
        return null;
      }
    }
    // Wait until ready
    registration = await navigator.serviceWorker.ready;
    const vapidPublic = await getVapidPublicKey();
    if (!vapidPublic) {
      console.warn("VAPID public key not available from server");
      return null;
    }
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublic),
    });

    // send to backend
    await savePushSubscription(sub);
    return sub;
  } catch (err) {
    console.error("Failed to subscribe to push:", err);
    return null;
  }
}
