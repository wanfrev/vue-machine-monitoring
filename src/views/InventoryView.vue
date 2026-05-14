<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import { onMounted, ref } from "vue";
import { useTheme } from "@/composables/useTheme";
import { useInventory } from "../composables/useInventory";

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;
const sidebarOpen = ref(false);
const {
  period,
  machineId,
  date,
  month,
  startDate,
  endDate,
  machineOptions,
  exchangeRate,
  rows,
  summary,
  loading,
  error,
  appliedRangeLabel,
  loadMachineOptions,
  loadInventory,
} = useInventory();

function formatMoney(n: number) {
  return Number(n || 0).toFixed(2);
}

onMounted(async () => {
  await loadMachineOptions();
  await loadInventory();
});
</script>

<template>
  <AppSidebar
    :open="sidebarOpen"
    :dark="isDark()"
    @close="sidebarOpen = false"
  />
  <div
    :class="[
      'min-h-screen px-3 py-4 sm:px-8 sm:py-6 space-y-6',
      isDark() ? 'bg-zinc-950' : 'bg-slate-100',
    ]"
  >
    <section
      class="rounded-2xl border backdrop-blur-xl px-4 py-4 shadow-sm sm:px-6"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-white'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border"
            :class="
              isDark()
                ? 'border-zinc-700/70 text-zinc-100'
                : 'border-sky-300/80 text-sky-700'
            "
            @click="sidebarOpen = true"
          >
            <img
              src="/img/icons/K11BOX.webp"
              alt="MachineHub"
              class="h-full w-full rounded-full object-cover"
            />
          </button>
          <div>
            <h1 class="text-xl font-semibold sm:text-2xl">Inventario</h1>
            <p
              class="text-xs"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              Contabilidad por maquina y periodos
            </p>
          </div>
        </div>
        <div class="text-right">
          <p
            class="text-xs"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Tasa actual
          </p>
          <p class="text-sm font-semibold">
            {{ formatMoney(exchangeRate) }} VES/USD
          </p>
        </div>
      </div>
    </section>

    <section
      class="rounded-2xl border backdrop-blur-xl p-4 sm:p-6"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-zinc-100'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label class="text-xs">
          Periodo
          <select
            v-model="period"
            class="app-select mt-1 h-9 w-full rounded-lg border px-2"
          >
            <option value="day">Dia</option>
            <option value="week">Semana (lun-dom)</option>
            <option value="month">Mes</option>
            <option value="custom">Rango</option>
          </select>
          <span
            v-if="period === 'week'"
            class="mt-1 block opacity-75"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            La fecha elige la semana; se usa lunes a domingo.
          </span>
        </label>

        <label class="text-xs">
          Maquina
          <select
            v-model="machineId"
            class="app-select mt-1 h-9 w-full rounded-lg border px-2"
          >
            <option value="">Todas</option>
            <option v-for="m in machineOptions" :key="m.id" :value="m.id">
              {{ m.name }}
            </option>
          </select>
        </label>

        <label v-if="period === 'day' || period === 'week'" class="text-xs">
          Fecha
          <input
            v-model="date"
            type="date"
            class="mt-1 h-9 w-full rounded-lg border px-2"
          />
        </label>
        <label v-if="period === 'month'" class="text-xs">
          Mes
          <input
            v-model="month"
            type="month"
            class="mt-1 h-9 w-full rounded-lg border px-2"
          />
        </label>
        <label v-if="period === 'custom'" class="text-xs">
          Desde
          <input
            v-model="startDate"
            type="date"
            class="mt-1 h-9 w-full rounded-lg border px-2"
          />
        </label>
        <label v-if="period === 'custom'" class="text-xs">
          Hasta
          <input
            v-model="endDate"
            type="date"
            class="mt-1 h-9 w-full rounded-lg border px-2"
          />
        </label>
      </div>
      <p
        v-if="appliedRangeLabel"
        class="mt-3 text-[11px] font-medium"
        :class="isDark() ? 'text-zinc-400' : 'text-slate-600'"
      >
        {{ appliedRangeLabel }}
      </p>
    </section>

    <section
      class="rounded-2xl border backdrop-blur-xl p-4 sm:p-6"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-zinc-100'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <p class="text-sm font-semibold">Resumen general</p>
      <div class="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        <div>Disponibles: {{ summary.availableCoins }}</div>
        <div>Vendidas: {{ summary.soldCoins }}</div>
        <div>Devueltas: {{ summary.returnedCoins }}</div>
        <div>Perdidas: {{ summary.lostCoins }}</div>
        <div>Pago movil: {{ formatMoney(summary.pagoMovil) }}</div>
        <div>Dolares: {{ formatMoney(summary.dolares) }}</div>
        <div>Bolivares: {{ formatMoney(summary.bolivares) }}</div>
        <div>Premio: {{ formatMoney(summary.premio) }}</div>
        <div>Total informado: {{ formatMoney(summary.totalReported) }}</div>
        <div class="font-semibold">
          Total contable: {{ formatMoney(summary.total) }}
        </div>
        <div>Total USD: {{ formatMoney(summary.totalUsdEquivalent) }}</div>
      </div>
      <div class="mt-2 text-xs">
        Eventos - Record: {{ summary.events.record }} | Premio:
        {{ summary.events.premio }} | Perdidas: {{ summary.events.perdidas }} |
        Devueltas: {{ summary.events.devueltas }}
      </div>
    </section>

    <section
      class="rounded-2xl border backdrop-blur-xl p-4 sm:p-6"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-zinc-100'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div
        v-if="error"
        class="mb-3 rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700"
      >
        {{ error }}
      </div>
      <div v-if="loading" class="text-sm">Cargando inventario...</div>
      <div v-else-if="!rows.length" class="text-sm">
        Sin maquinas en el alcance del filtro. Si eres supervisor, revisa
        asignaciones.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-xs sm:text-sm">
          <thead>
            <tr>
              <th class="px-2 py-2 text-left">Maquina</th>
              <th class="px-2 py-2 text-right">Disp. operadora</th>
              <th class="px-2 py-2 text-right">Vendidas</th>
              <th class="px-2 py-2 text-right">Devueltas</th>
              <th class="px-2 py-2 text-right">Perdidas</th>
              <th class="px-2 py-2 text-right">Pago movil</th>
              <th class="px-2 py-2 text-right">USD</th>
              <th class="px-2 py-2 text-right">VES</th>
              <th class="px-2 py-2 text-right">Premio</th>
              <th class="px-2 py-2 text-right">Tot. informado</th>
              <th class="px-2 py-2 text-right">Tot. contable</th>
              <th class="px-2 py-2 text-right">Total USD</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.machineId" class="border-t">
              <td class="px-2 py-2">
                <div class="font-medium">{{ row.machineName }}</div>
                <div class="text-[11px] opacity-70">
                  {{ row.machineLocation || "—" }}
                </div>
              </td>
              <td class="px-2 py-2 text-right">{{ row.availableCoins }}</td>
              <td class="px-2 py-2 text-right">{{ row.soldCoins }}</td>
              <td class="px-2 py-2 text-right">{{ row.returnedCoins }}</td>
              <td class="px-2 py-2 text-right">{{ row.lostCoins }}</td>
              <td class="px-2 py-2 text-right">
                {{ formatMoney(row.pagoMovil) }}
              </td>
              <td class="px-2 py-2 text-right">
                {{ formatMoney(row.dolares) }}
              </td>
              <td class="px-2 py-2 text-right">
                {{ formatMoney(row.bolivares) }}
              </td>
              <td class="px-2 py-2 text-right">
                {{ formatMoney(row.premio) }}
              </td>
              <td class="px-2 py-2 text-right">
                {{ formatMoney(row.totalReported) }}
              </td>
              <td class="px-2 py-2 text-right">
                {{ formatMoney(row.total) }}
              </td>
              <td class="px-2 py-2 text-right">
                {{ formatMoney(row.totalUsdEquivalent) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
