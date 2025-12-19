<script setup lang="ts">
import { computed, onMounted, ref, watch, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import {
  getMachines,
  getMachineDailyIncome,
  getMachineHistory,
} from "../api/client";
import BarChart from "../components/BarChart.vue";

type Machine = {
  id: string;
  name: string;
  status: string;
  location?: string;
  type?: string;
};

type ApiMachine = {
  id: string;
  name: string;
  status: string;
  location?: string;
  type?: string;
};

type ApiMachineHistoryEvent = {
  type?: string;
  timestamp?: string;
  data?: {
    cantidad?: number;
    amount?: number;
  };
};

const route = useRoute();
const loading = ref(false);
const machine = ref<Machine | null>(null);
// Monedas de HOY para la máquina seleccionada
const totalCoins = ref(0);

// Rol actual para controlar visibilidad de dinero
const currentRole = ref(localStorage.getItem("role") || "");
const isOperator = computed(() => currentRole.value === "operator");

function formatDate(d: Date) {
  // Fecha local YYYY-MM-DD (sin convertir a UTC)
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = new Date();
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(today.getDate() - 30);

const startDate = ref(formatDate(thirtyDaysAgo));
const endDate = ref(formatDate(today));

type ChartMode = "day" | "hour";
const chartMode = ref<ChartMode>("day");

const rangeStorageKey = computed(() => {
  const id = String(route.params.id ?? "");
  return `mm:range:machine-resumen:${id}`;
});

function readSavedRange() {
  try {
    const raw = localStorage.getItem(rangeStorageKey.value);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      startDate?: string;
      endDate?: string;
      chartMode?: ChartMode;
    };
    if (parsed.startDate) startDate.value = parsed.startDate;
    if (parsed.endDate) endDate.value = parsed.endDate;
    if (parsed.chartMode === "day" || parsed.chartMode === "hour") {
      chartMode.value = parsed.chartMode;
      // Mantener consistencia en modo por hora (un solo día)
      if (chartMode.value === "hour" && startDate.value) {
        endDate.value = startDate.value;
      }
    }
  } catch {
    // ignorar datos corruptos
  }
}

function writeSavedRange() {
  try {
    localStorage.setItem(
      rangeStorageKey.value,
      JSON.stringify({
        startDate: startDate.value,
        endDate: endDate.value,
        chartMode: chartMode.value,
      })
    );
  } catch {
    // ignore
  }
}

// Restaurar inmediatamente al cargar el componente
readSavedRange();

const dailyIncome = ref<{ date: string; income: number }[]>([]);
const hourlyIncome = ref<{ hour: number; income: number }[]>([]);
const hourlyCoins = ref<{ hour: number; coins: number }[]>([]);

const valuePerCoin = computed(() => {
  const name = machine.value?.name ?? "";
  return name.includes("Boxeo") ? 1 : 2;
});

const totalIncome = computed(() => totalCoins.value * valuePerCoin.value);
const isOn = computed(() => machine.value?.status === "active");

function getDateRangeArray(start: string, end: string) {
  const arr: string[] = [];
  let current = new Date(start);
  const last = new Date(end);
  while (current <= last) {
    arr.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return arr;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function addDaysYmd(ymd: string, days: number) {
  // Interpretar YYYY-MM-DD como fecha local
  const [y, m, d] = ymd.split("-").map((v) => Number(v));
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

async function loadHourlyIncome() {
  if (!machine.value) return;
  try {
    const apiStart = startDate.value;
    const apiEnd =
      startDate.value && endDate.value && startDate.value === endDate.value
        ? addDaysYmd(startDate.value, 1)
        : endDate.value;

    const history = (await getMachineHistory(machine.value.id, {
      startDate: apiStart,
      endDate: apiEnd,
    })) as unknown as ApiMachineHistoryEvent[];

    // La API tipada de getMachineHistory no incluye campos internos de evento,
    // pero el backend entrega { type, timestamp, data } (ya se usa así en MachineHistorialView).
    const byHourCoins = new Array<number>(24).fill(0);
    for (const raw of history) {
      if (raw?.type !== "coin_inserted") continue;
      const ts = raw?.timestamp ? new Date(raw.timestamp) : null;
      if (!ts || Number.isNaN(ts.getTime())) continue;
      const hour = ts.getHours();
      const cantidad = Number(raw?.data?.cantidad ?? raw?.data?.amount ?? 1);
      byHourCoins[hour] += Number.isFinite(cantidad) ? cantidad : 0;
    }

    hourlyCoins.value = byHourCoins.map((coins, hour) => ({ hour, coins }));
    hourlyIncome.value = byHourCoins.map((coins, hour) => {
      const value = isOperator.value ? coins : coins * valuePerCoin.value;
      return { hour, income: value };
    });
  } catch (e) {
    console.error("Error cargando ingresos por hora de la máquina:", e);
    hourlyIncome.value = [];
    hourlyCoins.value = [];
  }
}

function setChartMode(mode: ChartMode) {
  chartMode.value = mode;
  // En modo por hora mostramos un SOLO día (para que el tooltip muestre “el día del dato”)
  if (mode === "hour" && startDate.value && endDate.value) {
    if (startDate.value !== endDate.value) {
      endDate.value = startDate.value;
    }
  }
  writeSavedRange();
}

async function loadDailyIncome() {
  if (!machine.value) return;
  try {
    const data = await getMachineDailyIncome(machine.value.id, {
      startDate: startDate.value,
      endDate: endDate.value,
    });
    // El backend ya devuelve la fecha agrupada en zona local, usarla tal cual
    const mapped = (data || []).map((d) => {
      const date = d.date ? String(d.date).slice(0, 10) : "";
      const coins = Number(d.income);
      const value = isOperator.value ? coins : coins * valuePerCoin.value;
      return { date, income: value };
    });
    const allDates = getDateRangeArray(startDate.value, endDate.value);
    dailyIncome.value = allDates.map((date) => {
      const found = mapped.find((m) => m.date === date);
      return { date, income: found ? found.income : 0 };
    });
  } catch (e) {
    console.error("Error cargando ingresos diarios de la máquina:", e);
    dailyIncome.value = [];
  }
}

let refreshInterval: number | undefined;

async function fetchAllData() {
  loading.value = true;
  try {
    const all = (await getMachines()) as ApiMachine[];
    const routeId = route.params.id as string | undefined;
    const current = all.find((m) => m.name === routeId || m.id === routeId);
    if (current) {
      machine.value = current;
      // Monedas de HOY usando getMachineDailyIncome con rango de un solo día (fecha local)
      const today = new Date();
      const todayLocalStr = formatDate(today);
      const todayData = await getMachineDailyIncome(current.id, {
        startDate: todayLocalStr,
        endDate: todayLocalStr,
      });
      let coinsToday = 0;
      if (Array.isArray(todayData) && todayData.length) {
        const found = todayData.find((d) => {
          if (!d.date) return false;
          const dateStr = String(d.date).slice(0, 10);
          return dateStr === todayLocalStr;
        });
        coinsToday = found ? Number(found.income ?? 0) : 0;
      }
      totalCoins.value = coinsToday;
      if (chartMode.value === "hour") {
        await loadHourlyIncome();
      } else {
        await loadDailyIncome();
      }
    }
  } catch (e) {
    console.error("Error cargando resumen de máquina:", e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchAllData();
  refreshInterval = window.setInterval(fetchAllData, 10000); // 10 segundos
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
});

watch([startDate, endDate, machine, chartMode], async () => {
  if (!machine.value) return;
  if (startDate.value && endDate.value && startDate.value > endDate.value) {
    return;
  }
  writeSavedRange();
  if (chartMode.value === "hour") {
    await loadHourlyIncome();
  } else {
    await loadDailyIncome();
  }
});

const chartLabels = computed(() => {
  return chartMode.value === "hour"
    ? hourlyIncome.value.map((d) => `${pad2(d.hour)}:00`)
    : dailyIncome.value.map((d) => d.date);
});

const chartValues = computed(() => {
  return chartMode.value === "hour"
    ? hourlyIncome.value.map((d) => d.income)
    : dailyIncome.value.map((d) => d.income);
});

const hasChartData = computed(() => {
  return chartMode.value === "hour"
    ? hourlyIncome.value.length > 0
    : dailyIncome.value.length > 0;
});
</script>

<template>
  <!-- Resumen content: metrics grid + chart -->
  <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <div
      class="rounded-2xl border bg-white/60 backdrop-blur-xl px-4 py-3 shadow-sm border-slate-200/70"
    >
      <p
        class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
      >
        Estado actual
      </p>
      <p
        class="text-3xl font-semibold"
        :class="isOn ? 'text-green-600' : 'text-slate-500'"
      >
        {{ isOn ? "Encendida" : "Apagada" }}
      </p>
    </div>
    <div
      class="rounded-2xl border bg-white/60 backdrop-blur-xl px-4 py-3 shadow-sm border-slate-200/70"
    >
      <p
        class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
      >
        Monedas hoy
      </p>
      <p class="text-3xl font-semibold text-red-600">
        {{ totalCoins }}
      </p>
    </div>
    <div
      v-if="!isOperator"
      class="rounded-2xl border bg-white/60 backdrop-blur-xl px-4 py-3 shadow-sm border-slate-200/70"
    >
      <p
        class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
      >
        Ingresos hoy
      </p>
      <p class="text-3xl font-semibold text-red-600">$ {{ totalIncome }}</p>
    </div>
    <div
      v-if="!isOperator"
      class="rounded-2xl border bg-white/60 backdrop-blur-xl px-4 py-3 shadow-sm border-slate-200/70"
    >
      <p
        class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
      >
        Valor por moneda
      </p>
      <p class="text-3xl font-semibold text-slate-900">$ {{ valuePerCoin }}</p>
    </div>
  </section>

  <section
    class="mt-4 rounded-2xl border bg-white/60 backdrop-blur-xl p-4 shadow-sm sm:p-6 border-slate-200/70"
  >
    <div
      class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
    >
      <h2 class="text-sm font-semibold">
        {{
          isOperator
            ? chartMode === "hour"
              ? "Monedas por hora – Rango seleccionado"
              : "Monedas por día – Último mes"
            : chartMode === "hour"
            ? "$ Ingresos por hora – Rango seleccionado"
            : "$ Ingresos por día – Último mes"
        }}
      </h2>
      <div
        class="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto"
      >
        <div
          class="w-full sm:w-auto inline-flex items-center gap-1 rounded-full border p-1 text-xs sm:text-sm font-medium text-slate-600 bg-white/50 backdrop-blur border-slate-200/70"
          role="tablist"
          aria-label="Modo de gráfica"
        >
          <button
            type="button"
            class="rounded-full px-3 py-1.5 transition"
            :class="
              chartMode === 'day'
                ? 'bg-red-600 text-white'
                : 'text-slate-600 hover:bg-white/40'
            "
            role="tab"
            :aria-selected="chartMode === 'day'"
            @click="setChartMode('day')"
          >
            Por día
          </button>
          <button
            type="button"
            class="rounded-full px-3 py-1.5 transition"
            :class="
              chartMode === 'hour'
                ? 'bg-red-600 text-white'
                : 'text-slate-600 hover:bg-white/40'
            "
            role="tab"
            :aria-selected="chartMode === 'hour'"
            @click="setChartMode('hour')"
          >
            Por hora
          </button>
        </div>

        <div
          class="w-full sm:w-auto inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 bg-white/50 backdrop-blur border-slate-200/70"
        >
          <span class="hidden sm:inline">Rango:</span>
          <input
            v-model="startDate"
            type="date"
            class="min-w-0 flex-1 rounded-md border border-slate-200/70 bg-white/40 backdrop-blur px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <span class="text-slate-400">a</span>
          <input
            v-model="endDate"
            type="date"
            class="min-w-0 flex-1 rounded-md border border-slate-200/70 bg-white/40 backdrop-blur px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>
    </div>
    <div
      class="h-56 sm:h-72 lg:h-80 w-full rounded-xl border border-slate-200/70 px-2 py-4 bg-white/40 backdrop-blur flex items-center justify-center min-w-0"
    >
      <BarChart
        v-if="hasChartData"
        :chartData="{
          labels: chartLabels,
          datasets: [
            {
              label: isOperator ? 'Monedas' : 'Ingresos',
              backgroundColor: 'rgba(220, 38, 38, 0.55)',
              hoverBackgroundColor: 'rgba(220, 38, 38, 0.75)',
              borderColor: 'rgba(220, 38, 38, 0.9)',
              borderWidth: 1,
              data: chartValues,
              borderRadius: 6,
              maxBarThickness: 16,
              categoryPercentage: 0.9,
              barPercentage: 0.9,
            },
          ],
        }"
        :chartOptions="{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: {
              enabled: true,
              displayColors: false,
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              titleColor: 'rgba(248, 250, 252, 0.95)',
              bodyColor: 'rgba(248, 250, 252, 0.9)',
              padding: 10,
              cornerRadius: 10,
              callbacks: {
                title: (items) => {
                  const label = items?.[0]?.label ?? '';
                  if (chartMode === 'hour') {
                    // Mostrar solo el día (no el rango)
                    return `${startDate} ${label}`.trim();
                  }
                  return label;
                },
                label: (ctx) => {
                  const raw = (ctx as any)?.parsed?.y ?? (ctx as any)?.raw;
                  const yValue = typeof raw === 'number' ? raw : Number(raw);
                  const safeY = Number.isFinite(yValue) ? yValue : 0;

                  if (chartMode === 'hour' && !isOperator) {
                    const idx = Number((ctx as any)?.dataIndex ?? -1);
                    const coins = hourlyCoins[idx]?.coins ?? 0;
                    return [`Monedas: ${coins}`, `Ingresos: $ ${safeY}`];
                  }

                  const prefix = isOperator ? 'Monedas' : 'Ingresos';
                  return `${prefix}: ${safeY}`;
                },
              },
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: chartMode === 'hour' ? 'Hora' : 'Fecha',
              },
              ticks: {
                color: 'rgba(71, 85, 105, 0.9)',
                font: { size: 10 },
                autoSkip: true,
                maxTicksLimit: chartMode === 'hour' ? 12 : 10,
              },
              grid: { display: false },
            },
            y: {
              title: {
                display: true,
                text: isOperator ? 'Monedas' : 'Ingresos ($)',
              },
              beginAtZero: true,
              ticks: {
                color: 'rgba(71, 85, 105, 0.9)',
                font: { size: 10 },
                precision: 0,
              },
              grid: { color: 'rgba(220, 38, 38, 0.10)' },
            },
          },
        }"
        class="w-full h-full"
      />
      <p v-else class="mx-auto text-xs text-slate-400 text-center">
        {{
          isOperator
            ? "No hay datos de monedas para el rango seleccionado."
            : "No hay datos de ingresos para el rango seleccionado."
        }}
      </p>
    </div>
    <div class="mt-4 text-sm text-slate-600">
      <span class="inline-block h-3 w-3 rounded-sm bg-red-600"></span>
      <span class="ml-2">{{ isOperator ? "Monedas" : "Ingresos" }}</span>
    </div>
  </section>
</template>

<style scoped></style>
