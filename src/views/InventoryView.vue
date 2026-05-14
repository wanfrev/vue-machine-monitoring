<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import { onMounted, ref, computed } from "vue";
import { useTheme } from "@/composables/useTheme";
import { useInventory } from "../composables/useInventory";

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;
const sidebarOpen = ref(false);
const searchQuery = ref("");
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

const filteredRows = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return rows.value;
  return rows.value.filter((row) => {
    const name = (row.machineName || "").toLowerCase();
    const loc = (row.machineLocation || "").toLowerCase();
    return name.includes(q) || loc.includes(q);
  });
});

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
      <template v-else>
        <div class="mb-5">
          <label class="grid gap-1">
            <span
              class="text-xs font-medium"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >Buscar máquina o ubicación</span
            >
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Ej: Agilidad 01, Maracaibo..."
              class="h-10 w-full sm:w-80 rounded-xl border px-3 text-sm outline-none transition"
              :class="
                isDark()
                  ? 'bg-zinc-950/30 border-zinc-700/60 text-white focus:border-zinc-500'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-slate-400'
              "
            />
          </label>
        </div>

        <div v-if="!filteredRows.length" class="text-sm">
          No se encontraron máquinas para este filtro o búsqueda.
        </div>
        <div
          v-else
          class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <div
            v-for="row in filteredRows"
            :key="row.machineId"
            class="flex flex-col rounded-xl border p-4 shadow-sm transition-all hover:shadow-md"
            :class="
              isDark()
                ? 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60'
                : 'border-slate-200 bg-white/80 hover:bg-white'
            "
          >
            <div
              class="mb-3 border-b pb-3"
              :class="isDark() ? 'border-zinc-800/70' : 'border-slate-200/70'"
            >
              <h3 class="text-base font-bold">{{ row.machineName }}</h3>
              <p
                class="text-xs mt-0.5"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                {{ row.machineLocation || "—" }}
              </p>
            </div>

            <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm">
              <div class="flex justify-between">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Disp. op.</span
                >
                <span class="font-medium">{{ row.availableCoins }}</span>
              </div>
              <div class="flex justify-between">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Vendidas</span
                >
                <span class="font-medium">{{ row.soldCoins }}</span>
              </div>
              <div class="flex justify-between">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Devueltas</span
                >
                <span class="font-medium">{{ row.returnedCoins }}</span>
              </div>
              <div class="flex justify-between">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Perdidas</span
                >
                <span class="font-medium">{{ row.lostCoins }}</span>
              </div>

              <div
                class="col-span-2 my-1 border-t"
                :class="isDark() ? 'border-zinc-800/50' : 'border-slate-100'"
              ></div>

              <div class="flex justify-between">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Pago móvil</span
                >
                <span class="font-medium">{{
                  formatMoney(row.pagoMovil)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >USD</span
                >
                <span class="font-medium">{{ formatMoney(row.dolares) }}</span>
              </div>
              <div class="flex justify-between">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >VES</span
                >
                <span class="font-medium">{{
                  formatMoney(row.bolivares)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Premio</span
                >
                <span class="font-medium">{{ formatMoney(row.premio) }}</span>
              </div>

              <div
                class="col-span-2 my-1 border-t"
                :class="isDark() ? 'border-zinc-800/50' : 'border-slate-100'"
              ></div>

              <div class="flex justify-between">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Informado</span
                >
                <span class="font-medium">{{
                  formatMoney(row.totalReported)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Contable</span
                >
                <span class="font-medium">{{ formatMoney(row.total) }}</span>
              </div>
              <div
                class="col-span-2 flex justify-between font-semibold mt-1 rounded-lg px-2 py-1.5"
                :class="
                  isDark()
                    ? 'bg-zinc-800/60 text-zinc-100'
                    : 'bg-slate-100 text-slate-900'
                "
              >
                <span>Total USD</span>
                <span>{{ formatMoney(row.totalUsdEquivalent) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>
