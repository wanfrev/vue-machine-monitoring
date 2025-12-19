<script setup lang="ts">
import { getCoinsByMachine } from "../api/client";
const totalCoins = ref(0);
import { computed, onMounted, ref, watch, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import {
  getMachines,
  getMachinePowerLogs,
  getMachineDailyIncome,
} from "../api/client";

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

const machine = ref<Machine | null>(null);
const powerLogs = ref<PowerLog[]>([]);
const loading = ref(false);

// Rango de fechas para estadísticas (por defecto últimos 30 días)
function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const today = new Date();
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(today.getDate() - 30);

const startDate = ref(formatDate(thirtyDaysAgo));
const endDate = ref(formatDate(today));

const rangeStorageKey = computed(() => {
  const id = String(route.params.id ?? "");
  return `mm:range:machine-estadisticas:${id}`;
});

function readSavedRange() {
  try {
    const raw = localStorage.getItem(rangeStorageKey.value);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { startDate?: string; endDate?: string };
    if (parsed.startDate) startDate.value = parsed.startDate;
    if (parsed.endDate) endDate.value = parsed.endDate;
  } catch {
    // ignore
  }
}

function writeSavedRange() {
  try {
    localStorage.setItem(
      rangeStorageKey.value,
      JSON.stringify({ startDate: startDate.value, endDate: endDate.value })
    );
  } catch {
    // ignore
  }
}

readSavedRange();

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
  const d = new Date(utcString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

async function loadStats() {
  if (!machine.value) return;
  loading.value = true;
  try {
    const [logs, income, coinsPerMachine] = await Promise.all([
      getMachinePowerLogs(machine.value.id, {
        startDate: startDate.value,
        endDate: endDate.value,
      }),
      getMachineDailyIncome(machine.value.id, {
        startDate: startDate.value,
        endDate: endDate.value,
      }),
      getCoinsByMachine(),
    ]);
    powerLogs.value = (logs || []).map((log: any) => ({
      event: log.event,
      ts: toLocalDateTime(log.ts),
      dur: log.dur,
    }));
    dailyIncome.value = income;
    // Buscar monedas totales para esta máquina
    const row = Array.isArray(coinsPerMachine)
      ? coinsPerMachine.find((r) => r.machine_id === machine.value?.id)
      : null;
    totalCoins.value = row ? Number(row.total_coins ?? 0) : 0;
  } catch (e) {
    console.error("Error cargando estadísticas de máquina:", e);
    powerLogs.value = [];
    dailyIncome.value = [];
  } finally {
    loading.value = false;
  }
}

let refreshInterval: number | undefined;

async function fetchAllData() {
  try {
    const all = await getMachines();
    const routeId = route.params.id as string | undefined;
    const current = all.find(
      (m: any) => m.name === routeId || m.id === routeId
    );
    if (current) {
      machine.value = current;
      await loadStats();
    }
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
  writeSavedRange();
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
        <p class="mt-1 text-3xl font-semibold text-red-600">
          {{ usageRate.toFixed(1) }}%
        </p>
        <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            class="h-full bg-red-600"
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
        <p class="mt-1 text-3xl font-semibold text-red-600">
          {{ totalCoins }}
        </p>
        <p class="text-xs text-slate-400">Histórico</p>
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
            class="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <span class="text-slate-400">a</span>
          <input
            v-model="endDate"
            type="date"
            class="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>
      <div
        class="overflow-x-auto rounded-xl border border-slate-200/70 bg-white/40 backdrop-blur"
      >
        <table class="min-w-[520px] w-full text-sm">
          <thead class="bg-red-50/70 backdrop-blur text-slate-700">
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
              class="border-t border-slate-100 transition-colors hover:bg-red-100/50"
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
        Mostrando {{ powerLogs.length }} registros en el rango seleccionado
      </p>
    </div>
  </section>
</template>

<style scoped></style>
