<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted, watch } from "vue";

const darkMode = ref(false);
provide("darkMode", darkMode);

// Service worker update banner
const showUpdateBanner = ref(false);
let swRegistration: ServiceWorkerRegistration | null = null;

function applyHtmlDarkClass(isDark: boolean) {
  try {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  } catch (e) {
    // Ignorar si no hay document (por seguridad en entornos no-browser)
  }
}

function applyUpdate() {
  if (swRegistration && swRegistration.waiting) {
    // Ask the waiting SW to skipWaiting, then reload on controllerchange
    swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}

function onSwUpdated(ev: Event) {
  // registration passed from registerServiceWorker.ts
  const custom = ev as CustomEvent<ServiceWorkerRegistration>;
  swRegistration = custom.detail;
  showUpdateBanner.value = true;
}

function onControllerChange() {
  // When the new SW takes control, reload to load new assets
  window.location.reload();
}

onMounted(() => {
  // Inicializar modo oscuro desde preferencia guardada o del sistema
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme === "dark") {
    darkMode.value = true;
  } else if (storedTheme === "light") {
    darkMode.value = false;
  } else if (window.matchMedia) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
    darkMode.value = prefersDark.matches;
  }

  applyHtmlDarkClass(darkMode.value);

  window.addEventListener("swUpdated", onSwUpdated);
  navigator.serviceWorker?.addEventListener(
    "controllerchange",
    onControllerChange
  );
});

watch(darkMode, (value) => {
  localStorage.setItem("theme", value ? "dark" : "light");
  applyHtmlDarkClass(value);
});

onUnmounted(() => {
  window.removeEventListener("swUpdated", onSwUpdated);
  navigator.serviceWorker?.removeEventListener(
    "controllerchange",
    onControllerChange
  );
});
</script>

<template>
  <div
    :class="[
      'min-h-screen font-sans',
      darkMode
        ? 'dark bg-zinc-950 text-zinc-100'
        : 'bg-slate-50 text-slate-900',
    ]"
  >
    <!-- Update banner -->
    <div v-if="showUpdateBanner" class="fixed bottom-4 left-4 z-50">
      <div
        class="rounded-lg bg-yellow-500 text-black px-4 py-2 shadow-lg flex items-center gap-3"
      >
        <div class="text-sm font-medium">Nueva versión disponible</div>
        <button
          @click="applyUpdate"
          class="ml-2 bg-black/10 px-3 py-1 rounded text-sm"
        >
          Recargar ahora
        </button>
      </div>
    </div>
    <router-view />
  </div>
</template>
