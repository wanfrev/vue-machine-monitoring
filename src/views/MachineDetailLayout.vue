<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const id = computed(() => (route.params.id as string) || "Máquina");
const locationText = computed(
  () => (route.query.location as string) || "Centro comercial - Pasillo A"
);
const status = computed(() => (route.query.status as string) || "Activa");

function goBack() {
  router.push({ name: "dashboard" });
}

function refreshPage() {
  window.location.reload();
}

const isActive = (name: string) => route.name === name;
</script>

<template>
  <div class="min-h-screen px-3 py-4 sm:px-8 sm:py-6 bg-slate-50">
    <!-- Top bar -->
    <div
      class="mb-4 flex items-center justify-between rounded-2xl border bg-white/60 backdrop-blur-xl px-4 py-3 shadow-sm sm:px-6 border-slate-200/70"
    >
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer border-slate-200"
        @click="goBack"
      >
        <span>←</span>
        <span>Volver</span>
      </button>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer border-slate-200"
          aria-label="Refrescar"
          title="Refrescar"
          @click="refreshPage"
        >
          ↻
        </button>
        <span
          class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium"
          :class="
            status === 'Activa'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          "
        >
          <svg
            class="text-xs"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M12 2v10"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M7.05 6.05a7 7 0 1 0 9.9 0"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {{ status }}
        </span>
      </div>
    </div>

    <!-- Header -->
    <header
      class="mb-4 rounded-2xl border bg-white/60 backdrop-blur-xl px-4 py-4 shadow-sm sm:px-8 border-slate-200/70"
    >
      <h1 class="text-2xl font-semibold">{{ id }}</h1>
      <p class="text-sm text-slate-400">{{ locationText }}</p>

      <!-- Tabs as route links -->
      <nav class="mt-4 flex items-center gap-2">
        <RouterLink
          :to="{
            name: 'machine-resumen',
            params: { id: route.params.id },
            query: route.query,
          }"
          class="rounded-full px-4 py-1.5 text-sm font-medium cursor-pointer"
          :class="
            isActive('machine-resumen')
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'border border-slate-200/70 bg-white/40 backdrop-blur text-slate-600 hover:bg-white/60'
          "
        >
          General
        </RouterLink>
        <RouterLink
          :to="{
            name: 'machine-historial',
            params: { id: route.params.id },
            query: route.query,
          }"
          class="rounded-full px-4 py-1.5 text-sm font-medium cursor-pointer"
          :class="
            isActive('machine-historial')
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'border border-slate-200/70 bg-white/40 backdrop-blur text-slate-600 hover:bg-white/60'
          "
        >
          Monedas
        </RouterLink>
        <RouterLink
          :to="{
            name: 'machine-estadisticas',
            params: { id: route.params.id },
            query: route.query,
          }"
          class="rounded-full px-4 py-1.5 text-sm font-medium cursor-pointer"
          :class="
            isActive('machine-estadisticas')
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'border border-slate-200/70 bg-white/40 backdrop-blur text-slate-600 hover:bg-white/60'
          "
        >
          Tiempos de uso
        </RouterLink>
      </nav>
    </header>

    <RouterView />

    <footer class="mt-6 text-center text-xs text-slate-400">
      © 2025 MachineHub – Detalles de máquina
    </footer>
  </div>
</template>

<style scoped></style>
