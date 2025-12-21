<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted } from "vue";

const darkMode = ref(false);
provide("darkMode", darkMode);

// Service worker update banner
const showUpdateBanner = ref(false);
let swRegistration: ServiceWorkerRegistration | null = null;

function applyUpdate() {
  if (swRegistration && swRegistration.waiting) {
    // Ask the waiting SW to skipWaiting, then reload on controllerchange
    swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}

function onSwUpdated(ev: any) {
  // registration passed from registerServiceWorker.ts
  swRegistration = ev.detail as ServiceWorkerRegistration;
  showUpdateBanner.value = true;
}

function onControllerChange() {
  // When the new SW takes control, reload to load new assets
  window.location.reload();
}

onMounted(() => {
  window.addEventListener("swUpdated", onSwUpdated);
  navigator.serviceWorker?.addEventListener(
    "controllerchange",
    onControllerChange
  );
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
      darkMode ? 'dark bg-slate-900 text-white' : 'bg-white text-slate-900',
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
