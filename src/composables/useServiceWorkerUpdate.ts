import { ref } from "vue";

// Estado a nivel de módulo: un solo listener para toda la app, sin importar
// cuántos componentes usen este composable (evita duplicar el registro de
// eventos si se monta en App.vue y en otra pantalla a la vez).
const showUpdateCard = ref(false);
let swRegistration: ServiceWorkerRegistration | null = null;
let initialized = false;

function applyUpdate() {
  if (swRegistration && swRegistration.waiting) {
    // Le pide al service worker en espera que tome el control; el reload
    // real ocurre en el evento "controllerchange" de abajo.
    swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}

function onSwUpdated(ev: Event) {
  const custom = ev as CustomEvent<ServiceWorkerRegistration>;
  swRegistration = custom.detail;
  showUpdateCard.value = true;
}

function onControllerChange() {
  window.location.reload();
}

async function checkWaitingSw() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.waiting) {
      swRegistration = registration;
      showUpdateCard.value = true;
    }
  } catch {
    // ignore
  }
}

export function useServiceWorkerUpdate() {
  if (!initialized) {
    initialized = true;
    window.addEventListener("swUpdated", onSwUpdated);
    navigator.serviceWorker?.addEventListener(
      "controllerchange",
      onControllerChange
    );
    void checkWaitingSw();
  }

  return { showUpdateCard, applyUpdate };
}
