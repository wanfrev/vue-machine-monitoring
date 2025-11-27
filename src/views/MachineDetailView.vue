<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const id = computed(() => (route.params.id as string) || "Máquina");
const locationText = computed(
  () => (route.query.location as string) || "Centro comercial - Pasillo A"
);
const status = computed(() => (route.query.status as string) || "Activa");

function goBack() {
  router.back();
}
</script>

<template>
  <div class="min-h-screen px-3 py-4 sm:px-8 sm:py-6 bg-slate-50">
    <!-- Top bar -->
    <div class="mb-4 flex items-center justify-between rounded-2xl border bg-white px-4 py-3 shadow-sm sm:px-6 border-slate-200">
      <button type="button" class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer border-slate-200" @click="goBack">
        <span>←</span>
        <span>Volver</span>
      </button>
      <span
        class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium"
        :class="status === 'Activa' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-600'"
      >
        <span class="text-xs">⏻</span>
        {{ status }}
      </span>
    </div>

    <!-- Header -->
    <header class="mb-4 rounded-2xl border bg-white px-4 py-4 shadow-sm sm:px-8 border-slate-200">
      <h1 class="text-2xl font-semibold">{{ id }}</h1>
      <p class="text-sm text-slate-400">{{ locationText }}</p>

      <!-- Tabs -->
      <div class="mt-4 flex items-center gap-2">
        <button class="rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 cursor-pointer">Resumen</button>
        <button class="rounded-full border px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer border-slate-200">Historial</button>
        <button class="rounded-full border px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer border-slate-200">Estadísticas</button>
      </div>
    </header>

    <!-- Chart and controls -->
    <section class="rounded-2xl border bg-white p-4 shadow-sm sm:p-6 border-slate-200">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold">$ Ingresos por día – Último mes</h2>
        <button class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer border-slate-200">
          <span>📅</span>
          <span>27 oct - 26 nov</span>
        </button>
      </div>
      <!-- Chart placeholder -->
      <div class="h-64 w-full rounded-xl border border-dashed border-slate-300"></div>
      <div class="mt-4 text-sm text-slate-600">
        <span class="inline-block h-3 w-3 rounded-sm bg-slate-900"></span>
        <span class="ml-2">Ingresos</span>
      </div>
    </section>

    <!-- Metrics -->
    <section class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl border bg-white px-4 py-3 shadow-sm border-slate-200">
        <p
          class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
        >
          Total ingresos
        </p>
        <p class="text-3xl font-semibold text-red-600">$ 9102</p>
      </div>
      <div class="rounded-2xl border bg-white px-4 py-3 shadow-sm border-slate-200">
        <p
          class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
        >
          Total puntaje
        </p>
        <p class="text-3xl font-semibold text-red-600">95428</p>
      </div>
      <div class="rounded-2xl border bg-white px-4 py-3 shadow-sm border-slate-200">
        <p
          class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
        >
          Sesiones activas
        </p>
        <p class="text-3xl font-semibold text-green-600">60</p>
      </div>
      <div class="rounded-2xl border bg-white px-4 py-3 shadow-sm border-slate-200">
        <p
          class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
        >
          Tasa de uso
        </p>
        <p class="text-3xl font-semibold text-red-600">41.1 %</p>
      </div>
    </section>

    <footer class="mt-6 text-center text-xs text-slate-400">
      © 2025 MachineHub – Detalles de máquina
    </footer>
  </div>
</template>

<style scoped></style>
