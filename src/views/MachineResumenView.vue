<script setup lang="ts">
import { computed, onMounted, ref, watch, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  getMachines,
  getMachineDailyIncome,
  getMachineHistory,
} from "../api/client";
import BarChart from "../components/BarChart.vue";
import { useCurrentUser } from "@/composables/useCurrentUser";
import { useDateRangeStorage } from "@/composables/useDateRangeStorage";
import { filterMachinesForRole } from "@/utils/access";

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
const router = useRouter();
const loading = ref(false);
const machine = ref<Machine | null>(null);
// Monedas de HOY para la máquina seleccionada
const totalCoins = ref(0);

// Rol actual para controlar visibilidad de dinero
const { currentRole, isOperator, assignedMachineIds } = useCurrentUser();

function formatDate(d: Date) {
  // Fecha local YYYY-MM-DD (sin convertir a UTC)
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = new Date();
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const startDate = ref(formatDate(startOfMonth));
const endDate = ref(formatDate(today));

type ChartMode = "day" | "hour" | "month";
const chartMode = ref<ChartMode>("day");

// Modo mensual: seleccionar mes principal y (opcional) mes para comparar
const monthPrimary = ref<string>(formatDate(today).slice(0, 7)); // YYYY-MM
const monthCompare = ref<string>("");

function defaultDateRangeForNow() {
  // Default: from first day of current month to today
  const now = new Date();
  const startObj = new Date(now.getFullYear(), now.getMonth(), 1);
  const endObj = now;
  return { start: formatDate(startObj), end: formatDate(endObj) };
}

function defaultMonthForNow() {
  return formatDate(new Date()).slice(0, 7);
}

const hasActiveChartFilter = computed(() => {
  if (chartMode.value === "hour") return true;
  if (chartMode.value === "month") {
    return (
      monthCompare.value.trim() !== "" ||
      monthPrimary.value !== defaultMonthForNow()
    );
  }

  const def = defaultDateRangeForNow();
  return startDate.value !== def.start || endDate.value !== def.end;
});

function resetChartFilter() {
  const def = defaultDateRangeForNow();
  chartMode.value = "day";
  startDate.value = def.start;
  endDate.value = def.end;
  monthPrimary.value = defaultMonthForNow();
  monthCompare.value = "";
  clearStoredRange();
}

const rangeStorageKey = computed(() => {
  const id = String(route.params.id ?? "");
  return `mm:range:machine-resumen:${id}`;
});

const { writeStoredRange, clearStoredRange } = useDateRangeStorage({
  storageKey: rangeStorageKey,
  startDate,
  endDate,
  isActive: () => hasActiveChartFilter.value,
  writeExtra: () => ({
    chartMode: chartMode.value,
    monthPrimary: monthPrimary.value,
    monthCompare: monthCompare.value,
  }),
  readExtra: (parsed) => {
    const mode = String(parsed.chartMode || "");
    if (mode === "day" || mode === "hour" || mode === "month") {
      chartMode.value = mode as ChartMode;
      if (chartMode.value === "hour" && startDate.value) {
        endDate.value = startDate.value;
      }
    }
    if (typeof parsed.monthPrimary === "string" && parsed.monthPrimary) {
      monthPrimary.value = parsed.monthPrimary;
    }
    if (typeof parsed.monthCompare === "string") {
      monthCompare.value = parsed.monthCompare;
    }
  },
});

// Nota: no restauramos el rango guardado al cargar el componente
// para evitar aplicar filtros persistentes automáticamente.

const dailyIncome = ref<{ date: string; income: number }[]>([]);
const hourlyIncome = ref<{ hour: number; income: number }[]>([]);
const hourlyCoins = ref<{ hour: number; coins: number }[]>([]);

const monthlyPrimary = ref<{ day: number; income: number }[]>([]);
const monthlyCompare = ref<{ day: number; income: number }[]>([]);

const valuePerCoin = computed(() => {
  const name = (machine.value?.name ?? "").toLowerCase();
  if (name.includes("boxeo") || name.includes("agilidad")) {
    return 1;
  }
  return 2;
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

function daysInMonth(ym: string) {
  // ym: YYYY-MM
  const [y, m] = ym.split("-").map((v) => Number(v));
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
}

function ymdFromMonthDay(ym: string, day: number) {
  const safeDay = Math.max(1, Math.min(31, day));
  return `${ym}-${pad2(safeDay)}`;
}

async function loadMonthlyIncome(ym: string) {
  if (!machine.value) return [] as { day: number; income: number }[];
  const maxDay = daysInMonth(ym);
  const start = `${ym}-01`;
  const end = `${ym}-${pad2(maxDay)}`;
  try {
    const data = await getMachineDailyIncome(machine.value.id, {
      startDate: start,
      endDate: end,
    });
    const mapped = (data || []).map((d) => {
      const dateStr = d.date ? String(d.date).slice(0, 10) : "";
      const coins = Number(d.income);
      const value = isOperator.value ? coins : coins * valuePerCoin.value;
      return { date: dateStr, income: Number.isFinite(value) ? value : 0 };
    });

    const out: { day: number; income: number }[] = [];
    for (let day = 1; day <= maxDay; day++) {
      const ymd = ymdFromMonthDay(ym, day);
      const found = mapped.find((m) => m.date === ymd);
      out.push({ day, income: found ? found.income : 0 });
    }
    return out;
  } catch (e) {
    console.error("Error cargando ingresos mensuales de la máquina:", e);
    return [];
  }
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
  writeStoredRange();
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
    const raw = (await getMachines()) as ApiMachine[];
    type NormalizedMachine = ApiMachine & { id: string; status: string };
    const all: NormalizedMachine[] = raw.map((m) => ({
      ...m,
      id: String(m.id),
      status: String(m.status || "inactive"),
    }));
    const allowed = filterMachinesForRole<NormalizedMachine>(all, {
      role: currentRole.value,
      assignedMachineIds: assignedMachineIds.value,
    });
    const routeId = route.params.id as string | undefined;
    const current = allowed.find(
      (m) => m.name === routeId || String(m.id) === String(routeId)
    );
    if (!current) {
      machine.value = null;
      totalCoins.value = 0;
      dailyIncome.value = [];
      hourlyIncome.value = [];
      hourlyCoins.value = [];
      monthlyPrimary.value = [];
      monthlyCompare.value = [];
      router.replace({ name: "dashboard" });
      return;
    }

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
    } else if (chartMode.value === "day") {
      await loadDailyIncome();
    } else {
      monthlyPrimary.value = await loadMonthlyIncome(monthPrimary.value);
      monthlyCompare.value = monthCompare.value
        ? await loadMonthlyIncome(monthCompare.value)
        : [];
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

watch(
  [startDate, endDate, machine, chartMode, monthPrimary, monthCompare],
  async () => {
    if (!machine.value) return;
    writeStoredRange();

    if (chartMode.value !== "month") {
      if (startDate.value && endDate.value && startDate.value > endDate.value) {
        return;
      }
    }

    if (chartMode.value === "hour") {
      await loadHourlyIncome();
    } else if (chartMode.value === "day") {
      await loadDailyIncome();
    } else {
      // monthly
      monthlyPrimary.value = await loadMonthlyIncome(monthPrimary.value);
      monthlyCompare.value = monthCompare.value
        ? await loadMonthlyIncome(monthCompare.value)
        : [];
    }
  }
);

const maxMonthlyDays = computed(() => {
  const d1 = daysInMonth(monthPrimary.value);
  const d2 = monthCompare.value ? daysInMonth(monthCompare.value) : 0;
  return Math.max(d1, d2 || 0);
});

const chartLabels = computed(() => {
  if (chartMode.value === "hour") {
    return hourlyIncome.value.map((d) => `${pad2(d.hour)}:00`);
  }
  if (chartMode.value === "day") {
    return dailyIncome.value.map((d) => d.date);
  }
  // month
  return Array.from({ length: maxMonthlyDays.value }, (_, i) => pad2(i + 1));
});

const chartValues = computed(() => {
  if (chartMode.value === "hour")
    return hourlyIncome.value.map((d) => d.income);
  if (chartMode.value === "day") return dailyIncome.value.map((d) => d.income);
  const max = maxMonthlyDays.value;
  const map1 = new Map(monthlyPrimary.value.map((r) => [r.day, r.income]));
  return Array.from({ length: max }, (_, i) => map1.get(i + 1) ?? 0);
});

const chartCompareValues = computed(() => {
  if (chartMode.value !== "month") return [] as number[];
  if (!monthCompare.value) return [] as number[];
  const max = maxMonthlyDays.value;
  const map2 = new Map(monthlyCompare.value.map((r) => [r.day, r.income]));
  return Array.from({ length: max }, (_, i) => map2.get(i + 1) ?? 0);
});

// Valores de monedas por etiqueta (para añadir serie de monedas en el gráfico)
const chartCoins = computed(() => {
  if (chartMode.value === "hour") return hourlyCoins.value.map((d) => d.coins);
  if (chartMode.value === "day") {
    // dailyIncome stores converted value; original API 'income' was coins before conversion
    return dailyIncome.value.map((d) => {
      const val = Number(d.income || 0);
      return isOperator.value ? val : Math.round(val / valuePerCoin.value);
    });
  }
  // month
  const max = maxMonthlyDays.value;
  // monthlyPrimary holds converted income per day
  const map1 = new Map(monthlyPrimary.value.map((r) => [r.day, r.income]));
  return Array.from({ length: max }, (_, i) => {
    const inc = Number(map1.get(i + 1) ?? 0);
    return isOperator.value ? inc : Math.round(inc / valuePerCoin.value);
  });
});

const chartDatasets = computed(() => {
  const datasets: any[] = [
    {
      label:
        chartMode.value === "month"
          ? `${isOperator.value ? "Monedas" : "Ingresos"} (${
              monthPrimary.value
            })`
          : isOperator.value
          ? "Monedas"
          : "Ingresos",
      backgroundColor: "rgba(220, 38, 38, 0.55)",
      hoverBackgroundColor: "rgba(220, 38, 38, 0.75)",
      borderColor: "rgba(220, 38, 38, 0.9)",
      borderWidth: 1,
      data: chartValues.value,
      borderRadius: 6,
      maxBarThickness: 16,
      categoryPercentage: 0.9,
      barPercentage: 0.9,
      yAxisID: "y",
    },
  ];

  // If comparing months, add compare dataset (shares the same y)
  if (chartMode.value === "month" && monthCompare.value) {
    datasets.push({
      label: `${isOperator.value ? "Monedas" : "Ingresos"} (${
        monthCompare.value
      })`,
      backgroundColor: "rgba(71, 85, 105, 0.35)",
      hoverBackgroundColor: "rgba(71, 85, 105, 0.55)",
      borderColor: "rgba(71, 85, 105, 0.75)",
      borderWidth: 1,
      data: chartCompareValues.value,
      borderRadius: 6,
      maxBarThickness: 16,
      categoryPercentage: 0.9,
      barPercentage: 0.9,
      yAxisID: "y",
    });
  }

  // Add secondary dataset for coins so chart shows both ingresos and monedas
  if (!isOperator.value) {
    datasets.push({
      label: "Monedas",
      backgroundColor: "rgba(34, 197, 94, 0.65)",
      hoverBackgroundColor: "rgba(34, 197, 94, 0.85)",
      borderColor: "rgba(16, 185, 129, 0.9)",
      borderWidth: 0,
      data: chartCoins.value,
      borderRadius: 6,
      maxBarThickness: 8,
      categoryPercentage: 0.6,
      barPercentage: 0.6,
      yAxisID: "yCoins",
    });
  }

  return datasets;
});

const hasChartData = computed(() => {
  if (chartMode.value === "hour") return hourlyIncome.value.length > 0;
  if (chartMode.value === "day") return dailyIncome.value.length > 0;
  return monthlyPrimary.value.length > 0;
});

const totalMonthlyPrimary = computed(() => {
  if (chartMode.value !== "month") return 0;
  return monthlyPrimary.value.reduce(
    (s, r) => s + (Number.isFinite(r.income) ? r.income : 0),
    0
  );
});

const totalMonthlyCompare = computed(() => {
  if (chartMode.value !== "month" || !monthCompare.value) return 0;
  return monthlyCompare.value.reduce(
    (s, r) => s + (Number.isFinite(r.income) ? r.income : 0),
    0
  );
});

const chartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        enabled: true,
        displayColors: false,
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        titleColor: "rgba(248, 250, 252, 0.95)",
        bodyColor: "rgba(248, 250, 252, 0.9)",
        padding: 10,
        cornerRadius: 10,
        callbacks: {
          title: (items: any[]) => {
            const label = items?.[0]?.label ?? "";
            if (chartMode.value === "hour") {
              return `${startDate.value} ${label}`.trim();
            }
            if (chartMode.value === "month") {
              return `${monthPrimary.value} • Día ${label}`;
            }
            return label;
          },
          label: (ctx: any) => {
            const raw = ctx?.parsed?.y ?? ctx?.raw;
            const yValue = typeof raw === "number" ? raw : Number(raw);
            const safeY = Number.isFinite(yValue) ? yValue : 0;

            // If hour mode and viewing money, show coins + ingresos
            if (chartMode.value === "hour" && !isOperator.value) {
              const idx = Number(ctx?.dataIndex ?? -1);
              const coins = hourlyCoins.value[idx]?.coins ?? 0;
              return [`Monedas: ${coins}`, `Ingresos: $ ${safeY}`];
            }

            const dsLabel = ctx?.dataset?.label;
            const prefix =
              typeof dsLabel === "string" && dsLabel
                ? dsLabel
                : isOperator.value
                ? "Monedas"
                : "Ingresos";
            return `${prefix}: ${safeY}`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text:
            chartMode.value === "hour"
              ? "Hora"
              : chartMode.value === "month"
              ? "Día"
              : "Fecha",
          color: "rgba(71, 85, 105, 0.9)",
          font: { size: 12, weight: "600" },
          padding: { top: 6 },
        },
        offset: true,
        ticks: {
          color: "rgba(71, 85, 105, 0.9)",
          font: { size: 10 },
          autoSkip: true,
          maxTicksLimit:
            chartMode.value === "hour"
              ? 12
              : chartMode.value === "month"
              ? 12
              : 10,
          padding: 8,
          maxRotation: 0,
          minRotation: 0,
        },
        grid: { display: false, drawTicks: false },
        border: { display: true, color: "rgba(148, 163, 184, 0.35)" },
      },
      y: {
        title: {
          display: true,
          text: isOperator.value ? "Monedas" : "Ingresos ($)",
          color: "rgba(71, 85, 105, 0.9)",
          font: { size: 12, weight: "600" },
          padding: { bottom: 6 },
        },
        beginAtZero: true,
        ticks: {
          color: "rgba(71, 85, 105, 0.9)",
          font: { size: 10 },
          precision: 0,
          padding: 10,
        },
        grid: { color: "rgba(220, 38, 38, 0.10)", drawTicks: false },
        border: { display: true, color: "rgba(148, 163, 184, 0.35)" },
      },
      yCoins: {
        display: true,
        position: "right",
        title: {
          display: true,
          text: "Monedas",
          color: "rgba(71,85,105,0.9)",
          font: { size: 12, weight: "600" },
        },
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        ticks: {
          precision: 0,
          color: "rgba(71,85,105,0.9)",
          font: { size: 10 },
        },
      },
    },
  } as any;
});

function fmtAmount(n: number) {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString();
}
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
      <p class="text-3xl font-semibold text-emerald-600">
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
      <p class="text-3xl font-semibold text-emerald-600">$ {{ totalIncome }}</p>
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
              : chartMode === "month"
              ? `Monedas por mes – ${
                  monthCompare ? "Comparación" : "Mes seleccionado"
                }`
              : "Monedas por día – Último mes"
            : chartMode === "hour"
            ? "$ Ingresos por hora – Rango seleccionado"
            : chartMode === "month"
            ? `$ Ingresos por mes – ${
                monthCompare ? "Comparación" : "Mes seleccionado"
              }`
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
                ? 'bg-sky-600 text-white'
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
                ? 'bg-sky-600 text-white'
                : 'text-slate-600 hover:bg-white/40'
            "
            role="tab"
            :aria-selected="chartMode === 'hour'"
            @click="setChartMode('hour')"
          >
            Por hora
          </button>

          <button
            type="button"
            class="rounded-full px-3 py-1.5 transition"
            :class="
              chartMode === 'month'
                ? 'bg-sky-600 text-white'
                : 'text-slate-600 hover:bg-white/40'
            "
            role="tab"
            :aria-selected="chartMode === 'month'"
            @click="setChartMode('month')"
          >
            Por mes
          </button>
        </div>

        <div v-if="chartMode !== 'month'" class="w-full sm:w-auto">
          <div
            class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 bg-white/50 backdrop-blur border-slate-200/70"
            v-if="chartMode === 'day'"
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

            <button
              v-if="hasActiveChartFilter"
              type="button"
              class="rounded-md border border-slate-200/70 bg-white/50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white/70"
              @click="resetChartFilter"
            >
              Borrar filtro
            </button>
          </div>

          <div
            class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 bg-white/50 backdrop-blur border-slate-200/70"
            v-else-if="chartMode === 'hour'"
          >
            <span class="hidden sm:inline">Fecha:</span>
            <input
              v-model="startDate"
              type="date"
              class="min-w-0 flex-1 rounded-md border border-slate-200/70 bg-white/40 backdrop-blur px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
            />

            <button
              v-if="hasActiveChartFilter"
              type="button"
              class="rounded-md border border-slate-200/70 bg-white/50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white/70"
              @click="resetChartFilter"
            >
              Borrar filtro
            </button>
          </div>
        </div>

        <div
          v-else
          class="w-full sm:w-auto inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 bg-white/50 backdrop-blur border-slate-200/70"
        >
          <span class="hidden sm:inline">Mes:</span>
          <input
            v-model="monthPrimary"
            type="month"
            class="min-w-0 flex-1 rounded-md border border-slate-200/70 bg-white/40 backdrop-blur px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <span class="hidden sm:inline text-slate-400">vs</span>
          <input
            v-model="monthCompare"
            type="month"
            class="min-w-0 flex-1 rounded-md border border-slate-200/70 bg-white/40 backdrop-blur px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
          />

          <button
            v-if="hasActiveChartFilter"
            type="button"
            class="rounded-md border border-slate-200/70 bg-white/50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white/70"
            @click="resetChartFilter"
          >
            Borrar filtro
          </button>
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
          datasets: chartDatasets,
        }"
        :chartOptions="chartOptions"
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
      <span class="inline-block h-3 w-3 rounded-sm bg-emerald-500"></span>
      <span class="ml-2">
        {{
          chartMode === "month"
            ? `${isOperator ? "Monedas" : "Ingresos"} (${monthPrimary})`
            : isOperator
            ? "Monedas"
            : "Ingresos"
        }}
      </span>

      <template v-if="chartMode === 'month' && monthCompare">
        <span class="ml-6 inline-block h-3 w-3 rounded-sm bg-slate-500"></span>
        <span class="ml-2">{{
          `${isOperator ? "Monedas" : "Ingresos"} (${monthCompare})`
        }}</span>
      </template>
    </div>
    <!-- monedas-per-label UI removed per user request -->
    <div v-if="chartMode === 'month'" class="mt-3 text-sm text-slate-700">
      <span class="font-medium"
        >Total {{ isOperator ? "Monedas" : "Ingresos" }}:</span
      >
      <span class="ml-2" v-if="isOperator">{{ totalMonthlyPrimary }}</span>
      <span class="ml-2" v-else>$ {{ fmtAmount(totalMonthlyPrimary) }}</span>

      <template v-if="monthCompare">
        <span class="ml-4 text-slate-500">vs</span>
        <span class="ml-2 text-slate-500" v-if="isOperator">{{
          totalMonthlyCompare
        }}</span>
        <span class="ml-2 text-slate-500" v-else
          >$ {{ fmtAmount(totalMonthlyCompare) }}</span
        >
      </template>
    </div>
  </section>
</template>

<style scoped></style>
