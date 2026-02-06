<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  getMachines,
  getMachinePowerLogs,
  getMachineDailyIncome,
} from "../api/client";
import { useCurrentUser } from "@/composables/useCurrentUser";
import { useDateRangeStorage } from "@/composables/useDateRangeStorage";
import { filterMachinesForRole } from "@/utils/access";

const totalCoins = ref(0);

type Machine = {
  id: string;
  name: string;
  status: string;
  location?: string;
  type?: string;
};

type PowerLog = {
  event: "Encendido" | "Apagado";
  ts: string;
  dur: number | null; // minutos
};

const route = useRoute();
const router = useRouter();

const { currentRole, assignedMachineIds } = useCurrentUser();

const machine = ref<Machine | null>(null);
const powerLogs = ref<PowerLog[]>([]);
const loading = ref(false);

// Rango de fechas para estadísticas (por defecto desde inicio de mes hasta hoy)
function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const today = new Date();
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const startDate = ref(formatDate(startOfMonth));
const endDate = ref(formatDate(today));

function defaultDateRangeForNow() {
  const now = new Date();
  const end = formatDate(now);
  const startObj = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = formatDate(startObj);
  return { start, end };
}

const hasActiveDateFilter = computed(() => {
  const def = defaultDateRangeForNow();
  return startDate.value !== def.start || endDate.value !== def.end;
});

function resetDateRange() {
  const def = defaultDateRangeForNow();
  startDate.value = def.start;
  endDate.value = def.end;
  clearStoredRange();
}

const rangeStorageKey = computed(() => {
  const id = String(route.params.id ?? "");
  return `mm:range:machine-estadisticas:${id}`;
});

const { readStoredRange, writeStoredRange, clearStoredRange } =
  useDateRangeStorage({
    storageKey: rangeStorageKey,
    startDate,
    endDate,
    isActive: () => hasActiveDateFilter.value,
  });

readStoredRange();

// Ingresos diarios en el rango, para métricas de ingreso/hora
const dailyIncome = ref<{ date: string; income: number }[]>([]);

const sessions = computed(() =>
  powerLogs.value.filter((log) => log.event === "Encendido" && log.dur)
);

const totalActiveMinutes = computed(() =>
  sessions.value.reduce((sum, log) => sum + (log.dur ?? 0), 0)
);

const totalActiveHours = computed(() => totalActiveMinutes.value / 60);

const averageSessionHours = computed(() => {
  if (!sessions.value.length) return 0;
  return totalActiveHours.value / sessions.value.length;
});

function hoursInRange() {
  if (!startDate.value || !endDate.value) return 0;
  const start = new Date(startDate.value + "T00:00:00");
  const end = new Date(endDate.value + "T23:59:59");
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 0;
  return diffMs / (1000 * 60 * 60);
}

const usageRate = computed(() => {
  const totalRangeHours = hoursInRange();
  if (!totalRangeHours || !totalActiveHours.value) return 0;
  return (totalActiveHours.value / totalRangeHours) * 100;
});

const totalIncomeInRange = computed(() =>
  dailyIncome.value.reduce((sum, d) => sum + d.income, 0)
);

const incomePerHour = computed(() => {
  // Si no hay tiempo activo, mostrar 0 para evitar divisiones por cero o valores irreales
  if (
    !totalActiveHours.value ||
    isNaN(totalActiveHours.value) ||
    !isFinite(totalActiveHours.value)
  )
    return 0;
  return totalIncomeInRange.value / totalActiveHours.value;
});

function toLocalDateTime(utcString: string) {
  if (!utcString) return "";
  try {
    const d = new Date(utcString);
    return d.toLocaleString("es-VE", {
      timeZone: "America/Caracas",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch (e) {
    return String(utcString);
  }
}

async function loadStats() {
  if (!machine.value) return;
  loading.value = true;
  try {
    const [logs, income] = await Promise.all([
      getMachinePowerLogs(machine.value.id, {
        startDate: startDate.value,
        endDate: endDate.value,
      }),
      getMachineDailyIncome(machine.value.id, {
        startDate: startDate.value,
        endDate: endDate.value,
      }),
    ]);
    powerLogs.value = (logs || []).map((log: any) => ({
      event: log.event,
      ts: toLocalDateTime(log.ts),
      dur: log.dur,
    }));
    dailyIncome.value = income;

    // Monedas totales SOLO en el rango seleccionado
    totalCoins.value = Array.isArray(income)
      ? income.reduce((sum: number, d: any) => sum + Number(d?.income ?? 0), 0)
      : 0;
  } catch (e) {
    console.error("Error cargando estadísticas de máquina:", e);
    powerLogs.value = [];
    dailyIncome.value = [];
    totalCoins.value = 0;
  } finally {
    loading.value = false;
  }
}

let refreshInterval: number | undefined;

async function fetchAllData() {
  try {
    const all = (await getMachines()) as any[];
    const allowed = filterMachinesForRole(
      all.map((m) => ({
        ...m,
        id: String(m.id),
        status: String(m.status || "inactive"),
      })),
      { role: currentRole.value, assignedMachineIds: assignedMachineIds.value }
    );
    const routeId = route.params.id as string | undefined;
    const current = allowed.find(
      (m: any) => m.name === routeId || String(m.id) === String(routeId)
    );
    if (!current) {
      machine.value = null;
      powerLogs.value = [];
      dailyIncome.value = [];
      totalCoins.value = 0;
      router.replace({ name: "dashboard" });
      return;
    }

    machine.value = current;
    await loadStats();
  } catch (e) {
    console.error("Error inicializando estadísticas de máquina:", e);
  }
}

onMounted(() => {
  fetchAllData();
  refreshInterval = window.setInterval(fetchAllData, 10000); // 10 segundos
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
});

watch([startDate, endDate, machine], async () => {
  if (!machine.value) return;
  if (startDate.value && endDate.value && startDate.value > endDate.value) {
    return;
  }
  writeStoredRange();
  await loadStats();
});
</script>

<template>
  <section class="space-y-4">
    <!-- Metric cards -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <div
        class="rounded-2xl border bg-white/60 backdrop-blur-xl px-4 py-4 shadow-sm border-slate-200/70"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
          Tiempo promedio activo
        </p>
        <p class="mt-1 text-3xl font-semibold text-slate-900">
          {{ averageSessionHours.toFixed(1) }}h
        </p>
        <p class="text-xs text-slate-400">Por sesión</p>
      </div>
      <div
        class="rounded-2xl border bg-white/60 backdrop-blur-xl px-4 py-4 shadow-sm border-slate-200/70"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
          Tiempo total activo
        </p>
        <p class="mt-1 text-3xl font-semibold text-slate-900">
          {{ totalActiveHours.toFixed(1) }}h
        </p>
        <p class="text-xs text-slate-400">Este período</p>
      </div>
      <div
        class="rounded-2xl border bg-white/60 backdrop-blur-xl px-4 py-4 shadow-sm border-slate-200/70"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
          Tasa de uso
        </p>
        <p class="mt-1 text-3xl font-semibold text-emerald-600">
          {{ usageRate.toFixed(1) }}%
        </p>
        <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            class="h-full bg-emerald-500"
            :style="{ width: usageRate.toFixed(1) + '%' }"
          ></div>
        </div>
      </div>

      <div
        class="rounded-2xl border bg-white/60 backdrop-blur-xl px-4 py-4 shadow-sm border-slate-200/70"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
          Monedas totales
        </p>
        <p class="mt-1 text-3xl font-semibold text-emerald-600">
          {{ totalCoins }}
        </p>
        <p class="text-xs text-slate-400">En este período</p>
      </div>
      <div
        class="rounded-2xl border bg-white/60 backdrop-blur-xl px-4 py-4 shadow-sm border-slate-200/70"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
          Sesiones totales
        </p>
        <p class="mt-1 text-3xl font-semibold text-slate-900">
          {{ sessions.length }}
        </p>
        <p class="text-xs text-slate-400">En este período</p>
      </div>
    </div>

    <!-- Power logs table -->
    <div
      class="rounded-2xl border bg-white/60 backdrop-blur-xl p-4 shadow-sm sm:p-6 border-slate-200/70"
    >
      <div
        class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <h2 class="text-sm font-semibold">Registro de encendido/apagado</h2>
        <div
          class="w-full sm:w-auto inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 bg-white/50 backdrop-blur border-slate-200/70"
        >
          <span class="hidden sm:inline">Rango:</span>
          <input
            v-model="startDate"
            type="date"
            class="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <span class="text-slate-400">a</span>
          <input
            v-model="endDate"
            type="date"
            class="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
          />

          <button
            v-if="hasActiveDateFilter"
            type="button"
            class="rounded-md border border-slate-200/70 bg-white/50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white/70"
            @click="resetDateRange"
          >
            Borrar filtro
          </button>
        </div>
      </div>
      <div
        class="overflow-hidden rounded-xl border border-slate-200/70 bg-white/40 backdrop-blur px-4 py-4"
      >
        <div
          v-if="powerLogs.length === 0"
          class="py-4 text-center text-sm text-slate-400"
        >
          No hay registros en el rango seleccionado.
        </div>
        <div v-else class="relative">
          <div
            class="pointer-events-none absolute left-3 top-0 bottom-0 w-px bg-slate-200/80"
            aria-hidden="true"
          ></div>
          <ul class="space-y-4">
            <li
              v-for="(row, i) in powerLogs"
              :key="i"
              class="relative flex gap-3"
            >
              <div class="flex h-full items-start justify-center">
                <span
                  class="relative mt-1 inline-flex h-3 w-3 rounded-full ring-2 ring-white"
                  :class="
                    row.event === 'Encendido' ? 'bg-emerald-500' : 'bg-red-500'
                  "
                ></span>
              </div>
              <div
                class="flex flex-1 items-center justify-between gap-4 rounded-lg bg-transparent"
              >
                <div>
                  <p class="text-xs font-medium text-slate-700">
                    {{ row.event }}
                  </p>
                  <p class="text-xs text-slate-500">{{ row.ts }}</p>
                </div>
                <p
                  class="min-w-12 text-right text-xs font-medium text-slate-600"
                >
                  <span v-if="row.dur !== null">{{ row.dur }}m</span>
                  <span v-else>—</span>
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>
      <p class="mt-3 text-center text-xs text-slate-400">
        Mostrando {{ powerLogs.length }} registros en el rango seleccionado
      </p>
    </div>
  </section>
</template>

<style scoped></style>
