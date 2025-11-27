<script setup lang="ts">
import { ref } from "vue";

/* prettier-ignore */
const powerLogs = ref([
  { event: "Apagado",   ts: "2025-11-27 23:42", dur: null },
  { event: "Encendido", ts: "2025-11-27 09:14", dur: 51 },
  { event: "Apagado",   ts: "2025-11-26 23:53", dur: null },
  { event: "Encendido", ts: "2025-11-26 23:17", dur: 469 },
  { event: "Encendido", ts: "2025-11-25 21:35", dur: 252 },
  { event: "Apagado",   ts: "2025-11-25 20:12", dur: null },
  { event: "Encendido", ts: "2025-11-28 08:51", dur: 423 },
  { event: "Apagado",   ts: "2025-11-25 19:58", dur: null },
  { event: "Encendido", ts: "2025-11-24 22:07", dur: 365 },
  { event: "Apagado",   ts: "2025-11-24 22:07", dur: null },
]);
</script>

<template>
  <section class="space-y-4">
    <!-- Metric cards -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        class="rounded-2xl border bg-white px-4 py-4 shadow-sm border-slate-200"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
          Tiempo promedio activo
        </p>
        <p class="mt-1 text-3xl font-semibold text-slate-900">4.9h</p>
        <p class="text-xs text-slate-400">Por sesión</p>
      </div>
      <div
        class="rounded-2xl border bg-white px-4 py-4 shadow-sm border-slate-200"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
          Tiempo total activo
        </p>
        <p class="mt-1 text-3xl font-semibold text-slate-900">336h</p>
        <p class="text-xs text-slate-400">Este período</p>
      </div>
      <div
        class="rounded-2xl border bg-white px-4 py-4 shadow-sm border-slate-200"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
          Tasa de uso
        </p>
        <p class="mt-1 text-3xl font-semibold text-red-600">46.7%</p>
        <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div class="h-full bg-red-600" style="width: 46.7%"></div>
        </div>
      </div>
      <div
        class="rounded-2xl border bg-white px-4 py-4 shadow-sm border-slate-200"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
          Ingreso promedio/hora
        </p>
        <p class="mt-1 text-3xl font-semibold text-red-600">$35.25</p>
        <p class="text-xs text-slate-400">Basado en sesiones</p>
      </div>
      <div
        class="rounded-2xl border bg-white px-4 py-4 shadow-sm border-slate-200"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
          Puntaje promedio/hora
        </p>
        <p class="mt-1 text-3xl font-semibold text-slate-900">321</p>
        <p class="text-xs text-slate-400">Basado en sesiones</p>
      </div>
      <div
        class="rounded-2xl border bg-white px-4 py-4 shadow-sm border-slate-200"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
          Sesiones totales
        </p>
        <p class="mt-1 text-3xl font-semibold text-slate-900">69</p>
        <p class="text-xs text-slate-400">En este período</p>
      </div>
    </div>

    <!-- Power logs table -->
    <div
      class="rounded-2xl border bg-white p-4 shadow-sm sm:p-6 border-slate-200"
    >
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold">Registro de encendido/apagado</h2>
        <button
          class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer border-slate-200"
        >
          <span>📅</span>
          <span>Rango 27 oct - 26 nov</span>
        </button>
      </div>
      <div class="overflow-hidden rounded-xl border border-slate-200">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-500">
            <tr>
              <th class="px-4 py-2 text-left">Evento</th>
              <th class="px-4 py-2 text-left">Fecha y hora</th>
              <th class="px-4 py-2 text-left">Duración</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in powerLogs"
              :key="i"
              class="border-t border-slate-100"
            >
              <td class="px-4 py-2">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="
                    row.event === 'Encendido'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  "
                  >{{ row.event }}</span
                >
              </td>
              <td class="px-4 py-2 text-slate-600">{{ row.ts }}</td>
              <td class="px-4 py-2 text-slate-600">
                <span v-if="row.dur !== null">{{ row.dur }}m</span>
                <span v-else>—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-3 text-center text-xs text-slate-400">
        Mostrando últimos 10 registros de 138 totales
      </p>
    </div>
  </section>
</template>

<style scoped></style>
