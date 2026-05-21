<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import { onMounted, ref, computed } from "vue";
import { useTheme } from "@/composables/useTheme";
import { useInventory } from "../composables/useInventory";

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;
const sidebarOpen = ref(false);
const searchQuery = ref("");
const expandedMachines = ref<Set<string>>(new Set());
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

function toggleExpand(machineId: string) {
  const next = new Set(expandedMachines.value);
  if (next.has(machineId)) {
    next.delete(machineId);
  } else {
    next.add(machineId);
  }
  expandedMachines.value = next;
}

function isExpanded(machineId: string) {
  return expandedMachines.value.has(machineId);
}

function expandAll() {
  expandedMachines.value = new Set(rows.value.map((r) => r.machineId));
}

function collapseAll() {
  expandedMachines.value = new Set();
}

const periodOptions: { value: string; label: string }[] = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "custom", label: "Rango" },
];

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
      'min-h-screen px-3 py-4 sm:px-8 sm:py-6 space-y-4',
      isDark() ? 'bg-zinc-950' : 'bg-slate-100',
    ]"
  >
    <!-- Header -->
    <section
      class="rounded-2xl border backdrop-blur-xl px-4 py-3 shadow-sm sm:px-6"
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
            Tasa
          </p>
          <p class="text-sm font-semibold">
            {{ formatMoney(exchangeRate) }} VES
          </p>
        </div>
      </div>
    </section>

    <!-- Compact Filters -->
    <section
      class="rounded-2xl border backdrop-blur-xl px-3 py-2.5 shadow-sm"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70'
          : 'bg-white/60 border-slate-200/70'
      "
    >
      <div class="flex flex-wrap items-center gap-2">
        <!-- Period chips -->
        <div
          class="flex rounded-lg overflow-hidden border"
          :class="isDark() ? 'border-zinc-700/60' : 'border-slate-300'"
        >
          <button
            v-for="opt in periodOptions"
            :key="opt.value"
            type="button"
            class="px-2.5 py-1.5 text-xs font-medium transition-colors"
            :class="
              period === opt.value
                ? isDark()
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'bg-sky-100 text-sky-700'
                : isDark()
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-slate-500 hover:text-slate-700'
            "
            @click="period = opt.value as any"
          >
            {{ opt.label }}
          </button>
        </div>

        <!-- Machine selector -->
        <select
          v-model="machineId"
          class="h-8 rounded-lg border px-2 text-xs font-medium outline-none transition"
          :class="
            isDark()
              ? 'bg-zinc-800/50 border-zinc-700/60 text-zinc-200 focus:border-zinc-500'
              : 'bg-white border-slate-300 text-slate-700 focus:border-slate-400'
          "
        >
          <option value="">Todas</option>
          <option v-for="m in machineOptions" :key="m.id" :value="m.id">
            {{ m.name }}
          </option>
        </select>

        <!-- Date inputs -->
        <input
          v-if="period === 'day' || period === 'week'"
          v-model="date"
          type="date"
          class="h-8 rounded-lg border px-2 text-xs font-medium outline-none transition"
          :class="
            isDark()
              ? 'bg-zinc-800/50 border-zinc-700/60 text-zinc-200 focus:border-zinc-500'
              : 'bg-white border-slate-300 text-slate-700 focus:border-slate-400'
          "
        />
        <input
          v-if="period === 'month'"
          v-model="month"
          type="month"
          class="h-8 rounded-lg border px-2 text-xs font-medium outline-none transition"
          :class="
            isDark()
              ? 'bg-zinc-800/50 border-zinc-700/60 text-zinc-200 focus:border-zinc-500'
              : 'bg-white border-slate-300 text-slate-700 focus:border-slate-400'
          "
        />
        <template v-if="period === 'custom'">
          <input
            v-model="startDate"
            type="date"
            class="h-8 rounded-lg border px-2 text-xs font-medium outline-none transition"
            :class="
              isDark()
                ? 'bg-zinc-800/50 border-zinc-700/60 text-zinc-200 focus:border-zinc-500'
                : 'bg-white border-slate-300 text-slate-700 focus:border-slate-400'
            "
          />
          <span
            class="text-xs"
            :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
            >a</span
          >
          <input
            v-model="endDate"
            type="date"
            class="h-8 rounded-lg border px-2 text-xs font-medium outline-none transition"
            :class="
              isDark()
                ? 'bg-zinc-800/50 border-zinc-700/60 text-zinc-200 focus:border-zinc-500'
                : 'bg-white border-slate-300 text-slate-700 focus:border-slate-400'
            "
          />
        </template>
      </div>
    </section>

    <!-- Clean Summary Block -->
    <section
      class="rounded-2xl border backdrop-blur-xl px-4 py-4 shadow-sm"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-white'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <!-- Total USD - Hero number -->
      <div class="mb-3">
        <p
          class="text-xs font-medium"
          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
        >
          Total acumulado
        </p>
        <p
          class="text-3xl font-bold tracking-tight"
          :class="isDark() ? 'text-emerald-400' : 'text-emerald-600'"
        >
          ${{ formatMoney(summary.totalUsdEquivalent) }}
        </p>
      </div>

      <!-- Sub-metrics in clean columns -->
      <div class="grid grid-cols-3 gap-3">
        <!-- Coins column -->
        <div>
          <p
            class="text-[10px] font-semibold uppercase tracking-wider mb-1"
            :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
          >
            Monedas
          </p>
          <div class="space-y-0.5 text-xs">
            <div class="flex justify-between">
              <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Disp.</span
              >
              <span class="font-medium">{{ summary.availableCoins }}</span>
            </div>
            <div class="flex justify-between">
              <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Vendidas</span
              >
              <span class="font-medium">{{ summary.soldCoins }}</span>
            </div>
            <div class="flex justify-between">
              <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Devueltas</span
              >
              <span class="font-medium">{{ summary.returnedCoins }}</span>
            </div>
            <div class="flex justify-between">
              <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Perdidas</span
              >
              <span
                class="font-medium"
                :class="isDark() ? 'text-rose-400' : 'text-rose-600'"
                >{{ summary.lostCoins }}</span
              >
            </div>
          </div>
        </div>

        <!-- Payments column -->
        <div>
          <p
            class="text-[10px] font-semibold uppercase tracking-wider mb-1"
            :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
          >
            Pagos
          </p>
          <div class="space-y-0.5 text-xs">
            <div class="flex justify-between">
              <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >P. movil</span
              >
              <span class="font-medium">{{
                formatMoney(summary.pagoMovil)
              }}</span>
            </div>
            <div class="flex justify-between">
              <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >USD</span
              >
              <span class="font-medium">{{
                formatMoney(summary.dolares)
              }}</span>
            </div>
            <div class="flex justify-between">
              <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >VES</span
              >
              <span class="font-medium">{{
                formatMoney(summary.bolivares)
              }}</span>
            </div>
            <div class="flex justify-between">
              <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Premios</span
              >
              <span
                class="font-medium"
                :class="isDark() ? 'text-amber-400' : 'text-amber-600'"
                >{{ formatMoney(summary.premio) }}</span
              >
            </div>
          </div>
        </div>

        <!-- Totals column -->
        <div>
          <p
            class="text-[10px] font-semibold uppercase tracking-wider mb-1"
            :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
          >
            Totales
          </p>
          <div class="space-y-0.5 text-xs">
            <div class="flex justify-between">
              <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Informado</span
              >
              <span class="font-medium">{{
                formatMoney(summary.totalReported)
              }}</span>
            </div>
            <div class="flex justify-between">
              <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Contable</span
              >
              <span class="font-medium">{{ formatMoney(summary.total) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Machine List with Progressive Disclosure -->
    <section
      class="rounded-2xl border backdrop-blur-xl p-4 sm:p-6 shadow-sm"
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
        <!-- Search + expand/collapse controls -->
        <div class="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
          <div class="flex-1">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar maquina o ubicacion..."
              class="h-10 w-full rounded-xl border px-3 text-sm outline-none transition"
              :class="
                isDark()
                  ? 'bg-zinc-950/30 border-zinc-700/60 text-white focus:border-zinc-500'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-slate-400'
              "
            />
          </div>
          <div class="flex gap-1.5">
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg text-xs font-medium border transition"
              :class="
                isDark()
                  ? 'border-zinc-700/60 text-zinc-300 hover:bg-zinc-800/60'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              "
              @click="expandAll"
            >
              Expandir todo
            </button>
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg text-xs font-medium border transition"
              :class="
                isDark()
                  ? 'border-zinc-700/60 text-zinc-300 hover:bg-zinc-800/60'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              "
              @click="collapseAll"
            >
              Colapsar
            </button>
          </div>
        </div>

        <div
          v-if="!filteredRows.length"
          class="text-sm text-center py-6"
          :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
        >
          No se encontraron maquinas para este filtro o busqueda.
        </div>
        <div v-else class="space-y-1.5">
          <div
            v-for="row in filteredRows"
            :key="row.machineId"
            class="rounded-xl border overflow-hidden transition-all"
            :class="
              isDark()
                ? 'border-zinc-800/70 bg-zinc-900/40'
                : 'border-slate-200/70 bg-white/80'
            "
          >
            <!-- Compact row header -->
            <button
              type="button"
              class="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
              :class="
                isExpanded(row.machineId)
                  ? isDark()
                    ? 'bg-zinc-800/40'
                    : 'bg-slate-50'
                  : isDark()
                  ? 'hover:bg-zinc-800/20'
                  : 'hover:bg-slate-50/50'
              "
              @click="toggleExpand(row.machineId)"
            >
              <div class="flex items-center gap-3 min-w-0">
                <!-- Chevron -->
                <svg
                  class="h-4 w-4 shrink-0 transition-transform duration-200"
                  :class="[
                    isExpanded(row.machineId) ? 'rotate-90' : '',
                    isDark() ? 'text-zinc-500' : 'text-slate-400',
                  ]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
                <!-- Name + Location -->
                <div class="min-w-0">
                  <p class="text-sm font-semibold truncate">
                    {{ row.machineName }}
                  </p>
                  <p
                    class="text-xs truncate"
                    :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
                  >
                    {{ row.machineLocation || "Sin ubicacion" }}
                  </p>
                </div>
              </div>
              <!-- Total USD -->
              <div class="text-right shrink-0 ml-3">
                <p
                  class="text-xs"
                  :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
                >
                  Total
                </p>
                <p
                  class="text-sm font-bold"
                  :class="isDark() ? 'text-emerald-400' : 'text-emerald-600'"
                >
                  ${{ formatMoney(row.totalUsdEquivalent) }}
                </p>
              </div>
            </button>

            <!-- Expanded detail -->
            <div
              v-if="isExpanded(row.machineId)"
              class="border-t px-4 py-3"
              :class="isDark() ? 'border-zinc-800/50' : 'border-slate-200/50'"
            >
              <div
                class="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs"
              >
                <!-- Coins -->
                <div class="col-span-2 sm:col-span-1">
                  <p
                    class="text-[10px] font-semibold uppercase tracking-wider mb-1"
                    :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
                  >
                    Monedas
                  </p>
                  <div class="space-y-0.5">
                    <div class="flex justify-between">
                      <span
                        :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                        >Disp. op.</span
                      >
                      <span class="font-medium">{{ row.availableCoins }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span
                        :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                        >Vendidas</span
                      >
                      <span class="font-medium">{{ row.soldCoins }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span
                        :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                        >Devueltas</span
                      >
                      <span class="font-medium">{{ row.returnedCoins }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span
                        :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                        >Perdidas</span
                      >
                      <span
                        class="font-medium"
                        :class="isDark() ? 'text-rose-400' : 'text-rose-600'"
                        >{{ row.lostCoins }}</span
                      >
                    </div>
                  </div>
                </div>

                <!-- Payments -->
                <div class="col-span-2 sm:col-span-1">
                  <p
                    class="text-[10px] font-semibold uppercase tracking-wider mb-1"
                    :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
                  >
                    Pagos
                  </p>
                  <div class="space-y-0.5">
                    <div class="flex justify-between">
                      <span
                        :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                        >Pago movil</span
                      >
                      <span class="font-medium">{{
                        formatMoney(row.pagoMovil)
                      }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span
                        :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                        >USD</span
                      >
                      <span class="font-medium">{{
                        formatMoney(row.dolares)
                      }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span
                        :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                        >VES</span
                      >
                      <span class="font-medium">{{
                        formatMoney(row.bolivares)
                      }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span
                        :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                        >Premio</span
                      >
                      <span
                        class="font-medium"
                        :class="isDark() ? 'text-amber-400' : 'text-amber-600'"
                        >{{ formatMoney(row.premio) }}</span
                      >
                    </div>
                  </div>
                </div>

                <!-- Totals -->
                <div class="col-span-2 sm:col-span-1">
                  <p
                    class="text-[10px] font-semibold uppercase tracking-wider mb-1"
                    :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
                  >
                    Totales
                  </p>
                  <div class="space-y-0.5">
                    <div class="flex justify-between">
                      <span
                        :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                        >Informado</span
                      >
                      <span class="font-medium">{{
                        formatMoney(row.totalReported)
                      }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span
                        :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                        >Contable</span
                      >
                      <span class="font-medium">{{
                        formatMoney(row.total)
                      }}</span>
                    </div>
                  </div>
                  <!-- Events mini section -->
                  <div
                    class="mt-2 pt-2"
                    :class="
                      isDark()
                        ? 'border-t border-zinc-800/50'
                        : 'border-t border-slate-200/50'
                    "
                  >
                    <p
                      class="text-[10px] font-semibold uppercase tracking-wider mb-1"
                      :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
                    >
                      Eventos
                    </p>
                    <div class="space-y-0.5">
                      <div class="flex justify-between">
                        <span
                          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                          >Records</span
                        >
                        <span class="font-medium">{{ row.events.record }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span
                          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                          >Premios</span
                        >
                        <span class="font-medium">{{ row.events.premio }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span
                          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                          >Perdidas</span
                        >
                        <span
                          class="font-medium"
                          :class="isDark() ? 'text-rose-400' : 'text-rose-600'"
                          >{{ row.events.perdidas }}</span
                        >
                      </div>
                      <div class="flex justify-between">
                        <span
                          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                          >Devueltas</span
                        >
                        <span class="font-medium">{{
                          row.events.devueltas
                        }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>
