<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import BarChart from "@/components/BarChart.vue";
import DateRangeBar from "@/components/DateRangeBar.vue";
import EditExchangeRateModal from "@/components/EditExchangeRateModal.vue";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import type { ChartDataset } from "chart.js";
import {
  getInventorySummary,
  getMachineDailyIncome,
  getMachines,
  getUsers,
} from "@/api/client";
import { useCurrentUser } from "@/composables/useCurrentUser";
import { useCoinValues } from "@/composables/useCoinValues";
import { useTheme } from "@/composables/useTheme";
import { filterMachinesForRole, isSupervisorJobRole } from "@/utils/access";
import { getIncomeFromCoins } from "@/utils/machine";
import { formatLocalYmd, getMonthToDateRange } from "@/utils/date";

type MachineRow = {
  id: string;
  name: string;
  location?: string;
  type?: string;
  status?: string;
};

type DayCoins = { date: string; coins: number };

type ReportEvents = {
  record: number;
  premio: number;
  perdidas: number;
  devueltas: number;
};

// Cierre de caja reportado por la operadora (employee_daily_reports, via
// /api/inventory): esta es la fuente "oficial" de ingreso. Las monedas de la
// tabla `coins` (detectadas por la maquina) se muestran aparte, solo como
// verificacion.
type ReportMachineRow = {
  availableCoins: number;
  soldCoins: number;
  lostCoins: number;
  returnedCoins: number;
  pagoMovil: number;
  dolares: number;
  bolivares: number;
  premio: number;
  totalUsdEquivalent: number;
  premioUsdEquivalent: number;
  netUsdEquivalent: number;
  events: ReportEvents;
};

type ReportSummary = ReportMachineRow;

const ZERO_EVENTS: ReportEvents = {
  record: 0,
  premio: 0,
  perdidas: 0,
  devueltas: 0,
};

const ZERO_REPORT: ReportSummary = {
  availableCoins: 0,
  soldCoins: 0,
  lostCoins: 0,
  returnedCoins: 0,
  pagoMovil: 0,
  dolares: 0,
  bolivares: 0,
  premio: 0,
  totalUsdEquivalent: 0,
  premioUsdEquivalent: 0,
  netUsdEquivalent: 0,
  events: ZERO_EVENTS,
};

type Tab = "maquinas" | "evolucion" | "supervisores";
type Preset = "hoy" | "semana" | "mes" | "custom";

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;
const { currentRole, assignedMachineIds, isAdmin, capabilities } =
  useCurrentUser();
const { coinValues } = useCoinValues();
const router = useRouter();

const sidebarOpen = ref(false);
const loading = ref(false);
const machines = ref<MachineRow[]>([]);
const coinsByMachine = ref<Map<string, DayCoins[]>>(new Map());
const reportsSummary = ref<ReportSummary>(ZERO_REPORT);
const reportsByMachine = ref<Map<string, ReportMachineRow>>(new Map());
const supervisors = ref<{ id: number; name: string; machineIds: string[] }[]>(
  []
);
const exchangeRate = ref(0);
const isEditExchangeRateOpen = ref(false);
const expandedMachineIds = ref<Set<string>>(new Set());

function toggleExpanded(machineId: string) {
  const next = new Set(expandedMachineIds.value);
  if (next.has(machineId)) next.delete(machineId);
  else next.add(machineId);
  expandedMachineIds.value = next;
}

const activeTab = ref<Tab>("maquinas");
const preset = ref<Preset>("hoy");
const chartMachineId = ref("all");

const todayStr = () => formatLocalYmd(new Date());
const startDate = ref(todayStr());
const endDate = ref(todayStr());

function applyPreset(p: Preset) {
  preset.value = p;
  const today = todayStr();
  if (p === "hoy") {
    startDate.value = today;
    endDate.value = today;
  } else if (p === "semana") {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    startDate.value = formatLocalYmd(d);
    endDate.value = today;
  } else if (p === "mes") {
    const r = getMonthToDateRange();
    startDate.value = r.start;
    endDate.value = r.end;
  }
}

function onCustomStart(v: string) {
  preset.value = "custom";
  startDate.value = v;
}
function onCustomEnd(v: string) {
  preset.value = "custom";
  endDate.value = v;
}

function dayCount(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00`).getTime();
  const b = new Date(`${end}T00:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 1;
  return Math.round((b - a) / 86400000) + 1;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toIncome(m: MachineRow, coins: number): number {
  coinValues.value;
  return round2(getIncomeFromCoins(coins, m.name, m.type));
}

function sumCoins(rows: DayCoins[] | undefined): number {
  return (rows || []).reduce((s, r) => s + r.coins, 0);
}

const machineRows = computed(() =>
  machines.value
    .map((m) => {
      const coins = sumCoins(coinsByMachine.value.get(m.id));
      const report = reportsByMachine.value.get(m.id);
      return {
        machine: m,
        coins,
        available: report?.availableCoins || 0,
        reportedCoins: report?.soldCoins || 0,
        lost: report?.lostCoins || 0,
        returned: report?.returnedCoins || 0,
        pagoMovil: round2(report?.pagoMovil || 0),
        dolares: round2(report?.dolares || 0),
        bolivares: round2(report?.bolivares || 0),
        premioBs: round2(report?.premio || 0),
        grossUsd: round2(report?.totalUsdEquivalent || 0),
        netUsd: round2(report?.netUsdEquivalent || 0),
        premioUsd: round2(report?.premioUsdEquivalent || 0),
        events: report?.events || ZERO_EVENTS,
      };
    })
    .sort((a, b) => b.netUsd - a.netUsd || b.coins - a.coins)
);

const totalCoins = computed(() =>
  machineRows.value.reduce((s, r) => s + r.coins, 0)
);
const totalNetUsd = computed(() =>
  round2(reportsSummary.value.netUsdEquivalent)
);
const totalPremioUsd = computed(() =>
  round2(reportsSummary.value.premioUsdEquivalent)
);
const avgNetPerDay = computed(() =>
  round2(totalNetUsd.value / dayCount(startDate.value, endDate.value))
);
const bestMachine = computed(() => {
  const top = machineRows.value[0];
  return top && top.netUsd > 0 ? top.machine.name : "—";
});
const hasAnyActivity = computed(() =>
  machineRows.value.some(
    (r) =>
      r.reportedCoins > 0 || r.pagoMovil > 0 || r.dolares > 0 || r.bolivares > 0
  )
);

const supervisorRows = computed(() =>
  supervisors.value
    .map((s) => {
      const rows = machineRows.value.filter((r) =>
        s.machineIds.includes(r.machine.id)
      );
      return {
        id: s.id,
        name: s.name,
        machineCount: rows.length,
        machineNames: rows.map((r) => r.machine.name),
        coins: rows.reduce((sum, r) => sum + r.coins, 0),
        netUsd: round2(rows.reduce((sum, r) => sum + r.netUsd, 0)),
      };
    })
    .sort((a, b) => b.netUsd - a.netUsd)
);

const chartRows = computed(() => {
  const days: string[] = [];
  const cur = new Date(`${startDate.value}T00:00:00`);
  const last = new Date(`${endDate.value}T00:00:00`);
  while (cur <= last && days.length < 400) {
    days.push(formatLocalYmd(cur));
    cur.setDate(cur.getDate() + 1);
  }
  const totals = new Map<string, number>();
  for (const m of machines.value) {
    if (chartMachineId.value !== "all" && m.id !== chartMachineId.value) {
      continue;
    }
    for (const row of coinsByMachine.value.get(m.id) || []) {
      totals.set(
        row.date,
        (totals.get(row.date) || 0) + toIncome(m, row.coins)
      );
    }
  }
  return days.map((date) => ({ date, income: totals.get(date) || 0 }));
});

const chartData = computed(() => {
  const dataset: ChartDataset<"bar", number[]> = {
    label: "Monedas detectadas x precio ($) - verificacion",
    data: chartRows.value.map((r) => r.income),
    borderRadius: 6,
    backgroundColor: isDark()
      ? "rgba(56, 189, 248, 0.35)"
      : "rgba(2, 132, 199, 0.35)",
    borderColor: isDark() ? "#38bdf8" : "#0284c7",
    borderWidth: 1,
  };
  return {
    labels: chartRows.value.map((r) => r.date.slice(5)),
    datasets: [dataset],
  };
});

const chartOptions = computed(() => {
  const tick = isDark() ? "#a1a1aa" : "#64748b";
  const grid = isDark() ? "rgba(39,39,42,0.4)" : "rgba(148,163,184,0.3)";
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: { ticks: { color: tick, font: { size: 10 } }, grid: { color: grid } },
      y: {
        ticks: { color: tick, font: { size: 10 } },
        grid: { color: grid },
      },
    },
  };
});

let loadToken = 0;

async function loadIncome() {
  if (!startDate.value || !endDate.value || startDate.value > endDate.value) {
    return;
  }
  const token = ++loadToken;
  loading.value = true;
  const next = new Map<string, DayCoins[]>();
  await Promise.all(
    machines.value.map(async (m) => {
      try {
        const data = await getMachineDailyIncome(m.id, {
          startDate: startDate.value,
          endDate: endDate.value,
        });
        next.set(
          m.id,
          (Array.isArray(data) ? data : []).map((row) => ({
            date: String(row?.date || "").slice(0, 10),
            coins: Number(row?.income ?? 0) || 0,
          }))
        );
      } catch {
        next.set(m.id, []);
      }
    })
  );
  if (token !== loadToken) return;
  coinsByMachine.value = next;
  loading.value = false;
}

async function loadReports() {
  if (!startDate.value || !endDate.value || startDate.value > endDate.value) {
    return;
  }
  try {
    const data = await getInventorySummary({
      period: "custom",
      startDate: startDate.value,
      endDate: endDate.value,
    });
    exchangeRate.value = Number(data.exchangeRate || 0);
    reportsSummary.value = {
      availableCoins: Number(data.summary?.availableCoins || 0),
      soldCoins: Number(data.summary?.soldCoins || 0),
      lostCoins: Number(data.summary?.lostCoins || 0),
      returnedCoins: Number(data.summary?.returnedCoins || 0),
      pagoMovil: Number(data.summary?.pagoMovil || 0),
      dolares: Number(data.summary?.dolares || 0),
      bolivares: Number(data.summary?.bolivares || 0),
      premio: Number(data.summary?.premio || 0),
      totalUsdEquivalent: Number(data.summary?.totalUsdEquivalent || 0),
      premioUsdEquivalent: Number(data.summary?.premioUsdEquivalent || 0),
      netUsdEquivalent: Number(data.summary?.netUsdEquivalent || 0),
      events: {
        record: Number(data.summary?.events?.record || 0),
        premio: Number(data.summary?.events?.premio || 0),
        perdidas: Number(data.summary?.events?.perdidas || 0),
        devueltas: Number(data.summary?.events?.devueltas || 0),
      },
    };
    const map = new Map<string, ReportMachineRow>();
    for (const row of data.machines || []) {
      map.set(String(row.machineId), {
        availableCoins: Number(row.availableCoins || 0),
        soldCoins: Number(row.soldCoins || 0),
        lostCoins: Number(row.lostCoins || 0),
        returnedCoins: Number(row.returnedCoins || 0),
        pagoMovil: Number(row.pagoMovil || 0),
        dolares: Number(row.dolares || 0),
        bolivares: Number(row.bolivares || 0),
        premio: Number(row.premio || 0),
        totalUsdEquivalent: Number(row.totalUsdEquivalent || 0),
        premioUsdEquivalent: Number(row.premioUsdEquivalent || 0),
        netUsdEquivalent: Number(row.netUsdEquivalent || 0),
        events: {
          record: Number(row.events?.record || 0),
          premio: Number(row.events?.premio || 0),
          perdidas: Number(row.events?.perdidas || 0),
          devueltas: Number(row.events?.devueltas || 0),
        },
      });
    }
    reportsByMachine.value = map;
  } catch {
    reportsSummary.value = ZERO_REPORT;
    reportsByMachine.value = new Map();
  }
}

async function loadBase() {
  const raw = (await getMachines()) as MachineRow[];
  const all = (Array.isArray(raw) ? raw : []).map((m) => ({
    ...m,
    id: String(m.id),
  }));
  machines.value = filterMachinesForRole(all, {
    role: currentRole.value,
    assignedMachineIds: assignedMachineIds.value,
  });

  if (isAdmin.value) {
    try {
      const users = (await getUsers()) as {
        id: number;
        name?: string;
        username?: string;
        role?: string;
        jobRole?: string;
        assignedMachineIds?: string[];
      }[];
      supervisors.value = (Array.isArray(users) ? users : [])
        .filter((u) => u.role === "employee" && isSupervisorJobRole(u.jobRole))
        .map((u) => ({
          id: u.id,
          name: u.name || u.username || "Supervisor",
          machineIds: (u.assignedMachineIds || []).map(String),
        }));
    } catch {
      supervisors.value = [];
    }
  }
}

function openMachine(m: MachineRow) {
  const query: Record<string, string> = {};
  if (m.location) query.location = m.location;
  router.push({ name: "machine-resumen", params: { id: m.name }, query });
}

const tabs = computed(() => {
  const list: { key: Tab; label: string }[] = [
    { key: "maquinas", label: "Por máquina" },
    { key: "evolucion", label: "Evolución" },
  ];
  if (isAdmin.value)
    list.push({ key: "supervisores", label: "Por supervisor" });
  return list;
});

const presets: { key: Preset; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "semana", label: "7 días" },
  { key: "mes", label: "Este mes" },
  { key: "custom", label: "Rango" },
];

onMounted(async () => {
  await loadBase();
  await Promise.all([loadIncome(), loadReports()]);
});

watch([startDate, endDate], () => {
  void loadIncome();
  void loadReports();
});
</script>

<template>
  <AppSidebar
    :open="sidebarOpen"
    :dark="isDark()"
    @close="sidebarOpen = false"
  />

  <EditExchangeRateModal
    v-if="capabilities.canEditExchangeRate"
    :open="isEditExchangeRateOpen"
    :dark="isDark()"
    @close="isEditExchangeRateOpen = false"
    @saved="loadReports"
  />

  <div
    :class="[
      'min-h-screen px-3 py-4 sm:px-6 lg:px-8 space-y-4',
      isDark() ? 'bg-zinc-950 text-white' : 'bg-slate-100 text-slate-900',
    ]"
  >
    <header
      class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border backdrop-blur-xl px-4 py-4 shadow-sm sm:px-6"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70'
          : 'bg-white/60 border-slate-200/70'
      "
    >
      <div class="flex items-center gap-2 min-w-0">
        <button
          type="button"
          class="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl transition cursor-pointer group overflow-hidden shrink-0"
          :class="isDark() ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'"
          aria-label="Abrir menú lateral"
          @click="sidebarOpen = true"
        >
          <img
            src="/img/icons/K11BOX.webp"
            alt="K11 Box logo"
            class="h-7 w-7 sm:h-8 sm:w-8 object-cover rounded-lg"
          />
        </button>
        <div class="min-w-0">
          <h1 class="text-lg sm:text-2xl font-semibold leading-tight truncate">
            Finanzas
          </h1>
          <p
            class="text-xs truncate"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Ingreso neto = reporte de cierre (pago móvil + dólares + bolívares)
            − premios
          </p>
        </div>
      </div>

      <button
        v-if="capabilities.canEditExchangeRate"
        type="button"
        class="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition"
        :class="
          isDark()
            ? 'bg-red-600 text-white hover:bg-red-500'
            : 'bg-red-600 text-white hover:bg-red-700'
        "
        @click="isEditExchangeRateOpen = true"
      >
        Editar tasa
        <span v-if="exchangeRate > 0" class="font-normal opacity-80">
          (1$ = {{ exchangeRate }} Bs)
        </span>
      </button>
    </header>

    <section
      class="flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70'
          : 'bg-white/60 border-slate-200/70'
      "
    >
      <div class="flex flex-wrap gap-2">
        <button
          v-for="p in presets"
          :key="p.key"
          type="button"
          class="rounded-full border px-3 py-1.5 text-xs font-medium transition"
          :class="
            preset === p.key
              ? isDark()
                ? 'border-zinc-200 bg-zinc-100 text-zinc-900'
                : 'border-red-500 bg-red-500 text-white'
              : isDark()
              ? 'border-zinc-700/60 text-zinc-300 hover:bg-zinc-100/10'
              : 'border-slate-200 text-slate-600 hover:bg-white'
          "
          @click="applyPreset(p.key)"
        >
          {{ p.label }}
        </button>
      </div>
      <DateRangeBar
        v-if="preset === 'custom'"
        :start="startDate"
        :end="endDate"
        :is-dark="isDark()"
        :has-active-filter="false"
        @update:start="onCustomStart"
        @update:end="onCustomEnd"
      />
    </section>

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div
        v-for="tile in [
          { v: `$ ${totalNetUsd}`, l: 'Ingreso neto del período' },
          { v: `$ ${totalPremioUsd}`, l: 'Premios pagados' },
          { v: String(totalCoins), l: 'Monedas detectadas (máquina)' },
          { v: `$ ${avgNetPerDay}`, l: 'Promedio neto por día' },
        ]"
        :key="tile.l"
        class="rounded-2xl border px-3 py-2.5"
        :class="
          isDark()
            ? 'bg-zinc-900/70 border-zinc-800/70'
            : 'bg-white/60 border-slate-200/70'
        "
      >
        <p class="text-xl sm:text-2xl font-semibold truncate">{{ tile.v }}</p>
        <p
          class="text-xs"
          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
        >
          {{ tile.l }}
        </p>
      </div>
    </section>

    <section
      class="rounded-2xl border px-4 py-4 sm:px-6"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70'
          : 'bg-white/60 border-slate-200/70'
      "
    >
      <div
        class="flex gap-6 border-b text-sm font-medium"
        :class="isDark() ? 'border-zinc-800/70' : 'border-slate-200/70'"
      >
        <button
          v-for="t in tabs"
          :key="t.key"
          type="button"
          class="-mb-px pb-2 border-b-2 cursor-pointer"
          :class="
            activeTab === t.key
              ? isDark()
                ? 'border-zinc-200 text-zinc-100'
                : 'border-red-500 text-red-600'
              : isDark()
              ? 'border-transparent text-zinc-400'
              : 'border-transparent text-slate-500'
          "
          @click="activeTab = t.key"
        >
          {{ t.label }}
        </button>
      </div>

      <p
        v-if="loading"
        class="pt-4 text-sm"
        :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
      >
        Cargando…
      </p>

      <div v-else-if="activeTab === 'maquinas'" class="pt-3">
        <p
          class="pb-2 text-xs"
          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
        >
          Máquina que más vendió: <strong>{{ bestMachine }}</strong>
        </p>
        <p
          v-if="!hasAnyActivity"
          class="mb-3 rounded-xl border px-3 py-2 text-xs"
          :class="
            isDark()
              ? 'border-orange-500/30 bg-orange-500/10 text-orange-200'
              : 'border-orange-200 bg-orange-50 text-orange-700'
          "
        >
          Ninguna operadora ha enviado el cierre diario para este período
          todavía, por eso los montos están en $0.
        </p>
        <p
          v-if="machineRows.length === 0"
          class="py-4 text-sm"
          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
        >
          No hay máquinas para mostrar.
        </p>
        <ul
          class="divide-y"
          :class="isDark() ? 'divide-zinc-800/70' : 'divide-slate-200/70'"
        >
          <li v-for="row in machineRows" :key="row.machine.id">
            <button
              type="button"
              class="flex w-full items-center gap-3 py-3 text-left"
              @click="toggleExpanded(row.machine.id)"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold">
                  {{ row.machine.name }}
                </p>
                <p
                  class="truncate text-xs"
                  :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >
                  {{ row.machine.location || "Sin ubicación" }}
                </p>
                <div
                  class="mt-1 h-1.5 w-full overflow-hidden rounded-full"
                  :class="isDark() ? 'bg-zinc-800' : 'bg-slate-200'"
                >
                  <div
                    class="h-full rounded-full bg-red-500"
                    :style="{
                      width:
                        totalNetUsd > 0
                          ? `${Math.min(
                              100,
                              (row.netUsd / totalNetUsd) * 100
                            )}%`
                          : '0%',
                    }"
                  ></div>
                </div>
              </div>
              <div class="text-right shrink-0">
                <p class="text-base font-semibold">$ {{ row.netUsd }}</p>
                <p
                  class="text-xs"
                  :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >
                  {{ row.coins }} máquina · {{ row.reportedCoins }} declaradas
                </p>
                <p
                  v-if="row.lost > 0 || row.returned > 0 || row.premioUsd > 0"
                  class="text-xs"
                  :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
                >
                  <span v-if="row.premioUsd > 0"
                    >Premio $ {{ row.premioUsd }}</span
                  >
                  <span v-if="row.lost > 0"> · {{ row.lost }} perdidas</span>
                  <span v-if="row.returned > 0">
                    · {{ row.returned }} devueltas</span
                  >
                </p>
              </div>
              <span
                aria-hidden="true"
                class="transition-transform"
                :class="[
                  isDark() ? 'text-zinc-500' : 'text-slate-400',
                  expandedMachineIds.has(row.machine.id) ? 'rotate-90' : '',
                ]"
                >›</span
              >
            </button>

            <div
              v-if="expandedMachineIds.has(row.machine.id)"
              class="mb-3 space-y-2 rounded-xl border p-3 text-xs"
              :class="
                isDark()
                  ? 'border-zinc-800/70 bg-zinc-950/20'
                  : 'border-slate-200 bg-white/60'
              "
            >
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <p :class="isDark() ? 'text-zinc-500' : 'text-slate-400'">
                    Disponibles (operadora)
                  </p>
                  <p class="font-semibold">{{ row.available }}</p>
                </div>
                <div>
                  <p :class="isDark() ? 'text-zinc-500' : 'text-slate-400'">
                    Vendidas (declaradas)
                  </p>
                  <p class="font-semibold">{{ row.reportedCoins }}</p>
                </div>
                <div>
                  <p :class="isDark() ? 'text-zinc-500' : 'text-slate-400'">
                    Perdidas
                  </p>
                  <p
                    class="font-semibold"
                    :class="row.lost > 0 ? 'text-orange-500' : ''"
                  >
                    {{ row.lost }}
                  </p>
                </div>
                <div>
                  <p :class="isDark() ? 'text-zinc-500' : 'text-slate-400'">
                    Devueltas
                  </p>
                  <p
                    class="font-semibold"
                    :class="row.returned > 0 ? 'text-orange-500' : ''"
                  >
                    {{ row.returned }}
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div>
                  <p :class="isDark() ? 'text-zinc-500' : 'text-slate-400'">
                    Pago móvil
                  </p>
                  <p class="font-semibold">Bs {{ row.pagoMovil }}</p>
                </div>
                <div>
                  <p :class="isDark() ? 'text-zinc-500' : 'text-slate-400'">
                    Bolívares efectivo
                  </p>
                  <p class="font-semibold">Bs {{ row.bolivares }}</p>
                </div>
                <div>
                  <p :class="isDark() ? 'text-zinc-500' : 'text-slate-400'">
                    Dólares
                  </p>
                  <p class="font-semibold">$ {{ row.dolares }}</p>
                </div>
                <div>
                  <p :class="isDark() ? 'text-zinc-500' : 'text-slate-400'">
                    Premio
                  </p>
                  <p class="font-semibold">Bs {{ row.premioBs }}</p>
                </div>
                <div>
                  <p :class="isDark() ? 'text-zinc-500' : 'text-slate-400'">
                    Bruto
                  </p>
                  <p class="font-semibold">$ {{ row.grossUsd }}</p>
                </div>
                <div>
                  <p :class="isDark() ? 'text-zinc-500' : 'text-slate-400'">
                    Neto
                  </p>
                  <p class="font-semibold">$ {{ row.netUsd }}</p>
                </div>
              </div>

              <p
                v-if="
                  row.events.record ||
                  row.events.premio ||
                  row.events.perdidas ||
                  row.events.devueltas
                "
                :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
              >
                Eventos: {{ row.events.record }} record ·
                {{ row.events.premio }} premio ·
                {{ row.events.perdidas }} pérdidas ·
                {{ row.events.devueltas }} devueltas
              </p>

              <button
                type="button"
                class="font-semibold"
                :class="isDark() ? 'text-red-400' : 'text-red-600'"
                @click.stop="openMachine(row.machine)"
              >
                Ver ficha de la máquina →
              </button>
            </div>
          </li>
        </ul>
      </div>

      <div v-else-if="activeTab === 'evolucion'" class="pt-3">
        <label class="mb-3 flex items-center gap-2 text-xs">
          <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >Máquina</span
          >
          <select
            v-model="chartMachineId"
            class="rounded-lg border px-2 py-1 text-sm"
            :class="
              isDark()
                ? 'border-zinc-700/60 bg-zinc-950/40 text-zinc-100'
                : 'border-slate-200 bg-white text-slate-800'
            "
          >
            <option value="all">Todas</option>
            <option v-for="m in machines" :key="m.id" :value="m.id">
              {{ m.name }}
            </option>
          </select>
        </label>
        <p
          class="mb-2 text-xs"
          :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
        >
          Verificación por monedas detectadas en la máquina (no es el ingreso
          neto reportado arriba).
        </p>
        <div class="h-64">
          <BarChart :chart-data="chartData" :chart-options="chartOptions" />
        </div>
      </div>

      <div v-else class="pt-3">
        <p
          v-if="supervisorRows.length === 0"
          class="py-4 text-sm"
          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
        >
          No hay supervisores con máquinas asignadas.
        </p>
        <ul
          class="divide-y"
          :class="isDark() ? 'divide-zinc-800/70' : 'divide-slate-200/70'"
        >
          <li
            v-for="s in supervisorRows"
            :key="s.id"
            class="flex items-center gap-3 py-3"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold">{{ s.name }}</p>
              <p
                class="truncate text-xs"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                {{ s.machineNames.join(" · ") || "Sin máquinas" }}
              </p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-base font-semibold">$ {{ s.netUsd }}</p>
              <p
                class="text-xs"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                {{ s.coins }} monedas (máquina)
              </p>
            </div>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
