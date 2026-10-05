<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import BarChart from "@/components/BarChart.vue";
import DateRangeBar from "@/components/DateRangeBar.vue";
import EditExchangeRateModal from "@/components/EditExchangeRateModal.vue";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import type { ChartDataset } from "chart.js";
import {
  getAllMachinesDailyIncome,
  getDailySaleEntries,
  getDailySales,
  getInventorySummary,
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

// machineId -> (fecha YYYY-MM-DD -> monedas)
type CoinsByDay = Map<string, Map<string, number>>;
type Mermas = { lost: number; returned: number };

type ReportEvents = {
  record: number;
  premio: number;
  perdidas: number;
  devueltas: number;
};

// Cierre de caja que envia la operadora (employee_daily_reports, via
// /api/inventory): es lo que realmente se cobro (pago movil, bolivares,
// dolares) menos premios. Va aparte de lo que se registro y de lo que detecto
// la maquina.
type CashRow = {
  availableCoins: number;
  pagoMovil: number;
  dolares: number;
  bolivares: number;
  premio: number;
  totalUsdEquivalent: number;
  premioUsdEquivalent: number;
  netUsdEquivalent: number;
  events: ReportEvents;
};

const ZERO_EVENTS: ReportEvents = {
  record: 0,
  premio: 0,
  perdidas: 0,
  devueltas: 0,
};

const ZERO_CASH: CashRow = {
  availableCoins: 0,
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
type Preset = "ayer" | "hoy" | "semana" | "mes" | "custom";

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;
const { currentRole, assignedMachineIds, isAdmin, capabilities } =
  useCurrentUser();
const { coinValues } = useCoinValues();
const router = useRouter();

const sidebarOpen = ref(false);
const loading = ref(false);
const machines = ref<MachineRow[]>([]);
const detectedByMachine = ref<CoinsByDay>(new Map());
const registeredByMachine = ref<CoinsByDay>(new Map());
const mermasByMachine = ref<Map<string, Mermas>>(new Map());
const cashSummary = ref<CashRow>(ZERO_CASH);
const cashByMachine = ref<Map<string, CashRow>>(new Map());
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
const preset = ref<Preset>("ayer");
const chartMachineId = ref("all");

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatLocalYmd(d);
}

const startDate = ref(daysAgoStr(1));
const endDate = ref(daysAgoStr(1));

function applyPreset(p: Preset) {
  preset.value = p;
  if (p === "ayer") {
    startDate.value = daysAgoStr(1);
    endDate.value = daysAgoStr(1);
  } else if (p === "hoy") {
    startDate.value = daysAgoStr(0);
    endDate.value = daysAgoStr(0);
  } else if (p === "semana") {
    startDate.value = daysAgoStr(6);
    endDate.value = daysAgoStr(0);
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toUsd(m: MachineRow, coins: number): number {
  coinValues.value;
  return round2(getIncomeFromCoins(coins, m.name, m.type));
}

function sumDays(days: Map<string, number> | undefined): number {
  let s = 0;
  for (const v of days?.values() || []) s += v;
  return s;
}

function signedUsd(n: number): string {
  if (n === 0) return "$ 0";
  return n > 0 ? `+$ ${n}` : `-$ ${Math.abs(n)}`;
}

function diffLabel(diffCoins: number): string {
  if (diffCoins === 0) return "Cuadra";
  return diffCoins < 0
    ? `Faltan ${Math.abs(diffCoins)} por registrar`
    : `${diffCoins} registradas de más`;
}

const machineRows = computed(() => {
  const rows = machines.value.map((m) => {
    const det = detectedByMachine.value.get(m.id);
    const reg = registeredByMachine.value.get(m.id);
    const detectedCoins = sumDays(det);
    const registeredCoins = sumDays(reg);
    const detectedUsd = toUsd(m, detectedCoins);
    const registeredUsd = toUsd(m, registeredCoins);
    const diffCoins = registeredCoins - detectedCoins;

    const dates = new Set<string>([
      ...(det?.keys() || []),
      ...(reg?.keys() || []),
    ]);
    const days = [...dates]
      .sort()
      .reverse()
      .map((date) => {
        const d = det?.get(date) || 0;
        const r = reg?.get(date) || 0;
        return { date, detected: d, registered: r, diff: r - d };
      });

    const cash = cashByMachine.value.get(m.id) || ZERO_CASH;
    const mermas = mermasByMachine.value.get(m.id) || { lost: 0, returned: 0 };
    return {
      machine: m,
      detectedCoins,
      registeredCoins,
      detectedUsd,
      registeredUsd,
      diffCoins,
      diffUsd: round2(registeredUsd - detectedUsd),
      days,
      lost: mermas.lost,
      returned: mermas.returned,
      available: cash.availableCoins,
      pagoMovil: round2(cash.pagoMovil),
      bolivares: round2(cash.bolivares),
      dolares: round2(cash.dolares),
      premioBs: round2(cash.premio),
      premioUsd: round2(cash.premioUsdEquivalent),
      grossUsd: round2(cash.totalUsdEquivalent),
      netUsd: round2(cash.netUsdEquivalent),
      events: cash.events,
    };
  });
  return rows.sort(
    (a, b) =>
      Math.max(b.registeredUsd, b.detectedUsd) -
        Math.max(a.registeredUsd, a.detectedUsd) ||
      Math.abs(b.diffCoins) - Math.abs(a.diffCoins)
  );
});

const maxUsd = computed(() =>
  Math.max(
    0,
    ...machineRows.value.map((r) => Math.max(r.registeredUsd, r.detectedUsd))
  )
);

function barWidth(usd: number): string {
  return maxUsd.value > 0
    ? `${Math.min(100, (usd / maxUsd.value) * 100)}%`
    : "0%";
}

const totals = computed(() => {
  const t = {
    registeredCoins: 0,
    detectedCoins: 0,
    registeredUsd: 0,
    detectedUsd: 0,
    lost: 0,
    returned: 0,
  };
  for (const r of machineRows.value) {
    t.registeredCoins += r.registeredCoins;
    t.detectedCoins += r.detectedCoins;
    t.registeredUsd += r.registeredUsd;
    t.detectedUsd += r.detectedUsd;
    t.lost += r.lost;
    t.returned += r.returned;
  }
  return {
    ...t,
    registeredUsd: round2(t.registeredUsd),
    detectedUsd: round2(t.detectedUsd),
    diffCoins: t.registeredCoins - t.detectedCoins,
    diffUsd: round2(t.registeredUsd - t.detectedUsd),
  };
});

const cashNetUsd = computed(() => round2(cashSummary.value.netUsdEquivalent));
const cashGrossUsd = computed(() =>
  round2(cashSummary.value.totalUsdEquivalent)
);
const cashPremioUsd = computed(() =>
  round2(cashSummary.value.premioUsdEquivalent)
);
const availableTotal = computed(() => cashSummary.value.availableCoins);
const hasAnyCash = computed(
  () =>
    cashSummary.value.totalUsdEquivalent > 0 ||
    cashSummary.value.premio > 0 ||
    cashSummary.value.netUsdEquivalent !== 0
);

const supervisorRows = computed(() =>
  supervisors.value
    .map((s) => {
      const rows = machineRows.value.filter((r) =>
        s.machineIds.includes(r.machine.id)
      );
      const registeredUsd = round2(
        rows.reduce((sum, r) => sum + r.registeredUsd, 0)
      );
      const detectedUsd = round2(
        rows.reduce((sum, r) => sum + r.detectedUsd, 0)
      );
      return {
        id: s.id,
        name: s.name,
        machineNames: rows.map((r) => r.machine.name),
        registeredUsd,
        detectedUsd,
        diffUsd: round2(registeredUsd - detectedUsd),
        diffCoins: rows.reduce((sum, r) => sum + r.diffCoins, 0),
        netUsd: round2(rows.reduce((sum, r) => sum + r.netUsd, 0)),
      };
    })
    .sort((a, b) => b.registeredUsd - a.registeredUsd)
);

const chartRows = computed(() => {
  const days: string[] = [];
  const cur = new Date(`${startDate.value}T00:00:00`);
  const last = new Date(`${endDate.value}T00:00:00`);
  while (cur <= last && days.length < 400) {
    days.push(formatLocalYmd(cur));
    cur.setDate(cur.getDate() + 1);
  }
  const reg = new Map<string, number>();
  const det = new Map<string, number>();
  for (const m of machines.value) {
    if (chartMachineId.value !== "all" && m.id !== chartMachineId.value) {
      continue;
    }
    for (const [date, coins] of registeredByMachine.value.get(m.id) || []) {
      reg.set(date, (reg.get(date) || 0) + toUsd(m, coins));
    }
    for (const [date, coins] of detectedByMachine.value.get(m.id) || []) {
      det.set(date, (det.get(date) || 0) + toUsd(m, coins));
    }
  }
  return days.map((date) => ({
    date,
    registered: round2(reg.get(date) || 0),
    detected: round2(det.get(date) || 0),
  }));
});

const chartData = computed(() => {
  const operadora: ChartDataset<"bar", number[]> = {
    label: "Registró la operadora ($)",
    data: chartRows.value.map((r) => r.registered),
    borderRadius: 6,
    backgroundColor: "rgba(245, 158, 11, 0.45)",
    borderColor: "#f59e0b",
    borderWidth: 1,
  };
  const maquina: ChartDataset<"bar", number[]> = {
    label: "Detectó la máquina ($)",
    data: chartRows.value.map((r) => r.detected),
    borderRadius: 6,
    backgroundColor: isDark()
      ? "rgba(161, 161, 170, 0.45)"
      : "rgba(100, 116, 139, 0.45)",
    borderColor: isDark() ? "#a1a1aa" : "#64748b",
    borderWidth: 1,
  };
  return {
    labels: chartRows.value.map((r) => r.date.slice(5)),
    datasets: [operadora, maquina],
  };
});

const chartOptions = computed(() => {
  const tick = isDark() ? "#a1a1aa" : "#64748b";
  const grid = isDark() ? "rgba(39,39,42,0.4)" : "rgba(148,163,184,0.3)";
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: tick, font: { size: 11 } },
      },
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

function dayKey(v: unknown): string {
  return String(v ?? "").slice(0, 10);
}

function addCoins(
  target: CoinsByDay,
  machineId: string,
  date: string,
  coins: number
) {
  if (!machineId || !date || !Number.isFinite(coins)) return;
  let days = target.get(machineId);
  if (!days) {
    days = new Map();
    target.set(machineId, days);
  }
  days.set(date, (days.get(date) || 0) + coins);
}

let loadToken = 0;

async function loadComparison(token: number) {
  const params = { startDate: startDate.value, endDate: endDate.value };
  const [detected, sales, entries] = await Promise.all([
    getAllMachinesDailyIncome(params).catch(() => []),
    getDailySales(params).catch(() => []),
    getDailySaleEntries(params).catch(() => []),
  ]);
  if (token !== loadToken) return;

  const det: CoinsByDay = new Map();
  for (const r of Array.isArray(detected) ? detected : []) {
    addCoins(det, String(r.machineId), dayKey(r.date), Number(r.income) || 0);
  }
  const reg: CoinsByDay = new Map();
  for (const r of Array.isArray(sales) ? sales : []) {
    addCoins(
      reg,
      String(r?.machineId ?? ""),
      dayKey(r?.date),
      Number(r?.coins) || 0
    );
  }
  const mermas = new Map<string, Mermas>();
  for (const r of Array.isArray(entries) ? entries : []) {
    const id = String(r?.machineId ?? "");
    if (!id) continue;
    const cur = mermas.get(id) || { lost: 0, returned: 0 };
    cur.lost += Math.max(0, Number(r?.lost) || 0);
    cur.returned += Math.max(0, Number(r?.returned) || 0);
    mermas.set(id, cur);
  }
  detectedByMachine.value = det;
  registeredByMachine.value = reg;
  mermasByMachine.value = mermas;
}

function toCash(src: {
  availableCoins?: number;
  pagoMovil?: number;
  dolares?: number;
  bolivares?: number;
  premio?: number;
  totalUsdEquivalent?: number;
  premioUsdEquivalent?: number;
  netUsdEquivalent?: number;
  events?: Partial<ReportEvents>;
}): CashRow {
  return {
    availableCoins: Number(src.availableCoins || 0),
    pagoMovil: Number(src.pagoMovil || 0),
    dolares: Number(src.dolares || 0),
    bolivares: Number(src.bolivares || 0),
    premio: Number(src.premio || 0),
    totalUsdEquivalent: Number(src.totalUsdEquivalent || 0),
    premioUsdEquivalent: Number(src.premioUsdEquivalent || 0),
    netUsdEquivalent: Number(src.netUsdEquivalent || 0),
    events: {
      record: Number(src.events?.record || 0),
      premio: Number(src.events?.premio || 0),
      perdidas: Number(src.events?.perdidas || 0),
      devueltas: Number(src.events?.devueltas || 0),
    },
  };
}

async function loadCash(token: number) {
  try {
    const data = await getInventorySummary({
      period: "custom",
      startDate: startDate.value,
      endDate: endDate.value,
    });
    if (token !== loadToken) return;
    exchangeRate.value = Number(data.exchangeRate || 0);
    cashSummary.value = toCash(data.summary || {});
    const map = new Map<string, CashRow>();
    for (const row of data.machines || []) {
      map.set(String(row.machineId), toCash(row));
    }
    cashByMachine.value = map;
  } catch {
    if (token !== loadToken) return;
    cashSummary.value = ZERO_CASH;
    cashByMachine.value = new Map();
  }
}

async function loadAll() {
  if (!startDate.value || !endDate.value || startDate.value > endDate.value) {
    return;
  }
  const token = ++loadToken;
  loading.value = true;
  await Promise.all([loadComparison(token), loadCash(token)]);
  if (token === loadToken) loading.value = false;
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
  { key: "ayer", label: "Ayer" },
  { key: "hoy", label: "Hoy" },
  { key: "semana", label: "7 días" },
  { key: "mes", label: "Este mes" },
  { key: "custom", label: "Rango" },
];

onMounted(async () => {
  await loadBase();
  await loadAll();
});

watch([startDate, endDate], () => {
  void loadAll();
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
    @saved="loadAll"
  />

  <div
    :class="[
      'min-h-screen px-3 py-4 pb-28 sm:px-6 lg:px-8 space-y-4',
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
            class="text-xs"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Lo que registró la operadora vs. lo que detectó la máquina, y la
            caja del cierre diario
          </p>
        </div>
      </div>

      <button
        v-if="capabilities.canEditExchangeRate"
        type="button"
        class="shrink-0 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-500"
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
        class="rounded-2xl border px-3 py-2.5"
        :class="
          isDark()
            ? 'bg-zinc-900/70 border-zinc-800/70'
            : 'bg-white/60 border-slate-200/70'
        "
      >
        <p
          class="text-xl sm:text-2xl font-semibold truncate"
          :class="isDark() ? 'text-amber-300' : 'text-amber-600'"
        >
          $ {{ totals.registeredUsd }}
        </p>
        <p class="text-xs font-medium">Registró la operadora</p>
        <p
          class="text-[11px]"
          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
        >
          {{ totals.registeredCoins }} monedas
        </p>
      </div>
      <div
        class="rounded-2xl border px-3 py-2.5"
        :class="
          isDark()
            ? 'bg-zinc-900/70 border-zinc-800/70'
            : 'bg-white/60 border-slate-200/70'
        "
      >
        <p
          class="text-xl sm:text-2xl font-semibold truncate"
          :class="isDark() ? 'text-zinc-200' : 'text-zinc-600'"
        >
          $ {{ totals.detectedUsd }}
        </p>
        <p class="text-xs font-medium">Detectó la máquina</p>
        <p
          class="text-[11px]"
          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
        >
          {{ totals.detectedCoins }} monedas
        </p>
      </div>
      <div
        class="rounded-2xl border px-3 py-2.5"
        :class="[
          totals.diffCoins !== 0
            ? isDark()
              ? 'bg-orange-500/10 border-orange-500/30'
              : 'bg-orange-50 border-orange-200'
            : isDark()
            ? 'bg-zinc-900/70 border-zinc-800/70'
            : 'bg-white/60 border-slate-200/70',
        ]"
      >
        <p
          class="text-xl sm:text-2xl font-semibold truncate"
          :class="
            totals.diffCoins !== 0
              ? isDark()
                ? 'text-orange-300'
                : 'text-orange-600'
              : ''
          "
        >
          {{ signedUsd(totals.diffUsd) }}
        </p>
        <p class="text-xs font-medium">Diferencia</p>
        <p
          class="text-[11px]"
          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
        >
          {{ diffLabel(totals.diffCoins) }}
        </p>
      </div>
      <div
        class="rounded-2xl border px-3 py-2.5"
        :class="
          isDark()
            ? 'bg-zinc-900/70 border-zinc-800/70'
            : 'bg-white/60 border-slate-200/70'
        "
      >
        <p class="text-xl sm:text-2xl font-semibold truncate">
          $ {{ cashNetUsd }}
        </p>
        <p class="text-xs font-medium">Caja neta (cierre diario)</p>
        <p
          class="text-[11px]"
          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
        >
          bruto $ {{ cashGrossUsd }} − premios $ {{ cashPremioUsd }}
        </p>
      </div>
    </section>

    <section
      class="flex flex-wrap gap-x-4 gap-y-1 rounded-2xl border px-4 py-2 text-xs"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-zinc-400'
          : 'bg-white/60 border-slate-200/70 text-slate-500'
      "
    >
      <span>
        Pérdidas: <strong>{{ totals.lost }}</strong>
      </span>
      <span>
        Devueltas: <strong>{{ totals.returned }}</strong>
      </span>
      <span>
        Monedas disponibles (operadoras): <strong>{{ availableTotal }}</strong>
      </span>
      <span class="opacity-80">
        Pérdidas y devueltas no se suman como ingreso.
      </span>
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
          v-if="!hasAnyCash"
          class="mb-3 rounded-xl border px-3 py-2 text-xs"
          :class="
            isDark()
              ? 'border-orange-500/30 bg-orange-500/10 text-orange-200'
              : 'border-orange-200 bg-orange-50 text-orange-700'
          "
        >
          Ninguna operadora ha enviado el cierre diario de este período, por eso
          la caja neta está en $0. Lo registrado por las operadoras y lo
          detectado por las máquinas sí se muestra.
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
                <div class="flex items-center gap-2 min-w-0">
                  <p class="truncate text-sm font-semibold">
                    {{ row.machine.name }}
                  </p>
                  <span
                    class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    :class="
                      row.diffCoins === 0
                        ? isDark()
                          ? 'bg-zinc-500/15 text-zinc-300'
                          : 'bg-zinc-100 text-zinc-600'
                        : isDark()
                        ? 'bg-orange-500/15 text-orange-300'
                        : 'bg-orange-50 text-orange-700'
                    "
                  >
                    {{ diffLabel(row.diffCoins) }}
                  </span>
                </div>
                <p
                  class="truncate text-xs"
                  :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >
                  {{ row.machine.location || "Sin ubicación" }}
                </p>
                <div class="mt-1.5 space-y-1">
                  <div class="flex items-center gap-2">
                    <div
                      class="h-1.5 flex-1 overflow-hidden rounded-full"
                      :class="isDark() ? 'bg-zinc-800' : 'bg-slate-200'"
                    >
                      <div
                        class="h-full rounded-full bg-amber-500"
                        :style="{ width: barWidth(row.registeredUsd) }"
                      ></div>
                    </div>
                    <span
                      class="w-24 shrink-0 text-right text-[11px] font-medium"
                      :class="isDark() ? 'text-amber-300' : 'text-amber-700'"
                    >
                      Operadora $ {{ row.registeredUsd }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div
                      class="h-1.5 flex-1 overflow-hidden rounded-full"
                      :class="isDark() ? 'bg-zinc-800' : 'bg-slate-200'"
                    >
                      <div
                        class="h-full rounded-full"
                        :class="isDark() ? 'bg-zinc-400' : 'bg-slate-500'"
                        :style="{ width: barWidth(row.detectedUsd) }"
                      ></div>
                    </div>
                    <span
                      class="w-24 shrink-0 text-right text-[11px] font-medium"
                      :class="isDark() ? 'text-zinc-300' : 'text-zinc-600'"
                    >
                      Máquina $ {{ row.detectedUsd }}
                    </span>
                  </div>
                </div>
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
              class="mb-3 space-y-3 rounded-xl border p-3 text-xs"
              :class="
                isDark()
                  ? 'border-zinc-800/70 bg-zinc-950/20'
                  : 'border-slate-200 bg-white/60'
              "
            >
              <div>
                <p class="mb-1 font-semibold">Operadora vs. máquina</p>
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <p :class="isDark() ? 'text-zinc-500' : 'text-slate-400'">
                      Registró la operadora
                    </p>
                    <p class="font-semibold">
                      {{ row.registeredCoins }} monedas
                    </p>
                    <p class="font-semibold">$ {{ row.registeredUsd }}</p>
                  </div>
                  <div>
                    <p :class="isDark() ? 'text-zinc-500' : 'text-slate-400'">
                      Detectó la máquina
                    </p>
                    <p class="font-semibold">{{ row.detectedCoins }} monedas</p>
                    <p class="font-semibold">$ {{ row.detectedUsd }}</p>
                  </div>
                  <div>
                    <p :class="isDark() ? 'text-zinc-500' : 'text-slate-400'">
                      Diferencia
                    </p>
                    <p
                      class="font-semibold"
                      :class="row.diffCoins !== 0 ? 'text-orange-500' : ''"
                    >
                      {{ row.diffCoins > 0 ? "+" : "" }}{{ row.diffCoins }}
                      monedas
                    </p>
                    <p
                      class="font-semibold"
                      :class="row.diffCoins !== 0 ? 'text-orange-500' : ''"
                    >
                      {{ signedUsd(row.diffUsd) }}
                    </p>
                  </div>
                </div>
                <p
                  class="mt-1"
                  :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
                >
                  Diferencia = registrado por la operadora − detectado por la
                  máquina.
                </p>
              </div>

              <div v-if="row.days.length > 0">
                <p class="mb-1 font-semibold">Por día (monedas)</p>
                <table class="w-full text-left">
                  <thead>
                    <tr :class="isDark() ? 'text-zinc-500' : 'text-slate-400'">
                      <th class="py-0.5 font-medium">Fecha</th>
                      <th class="py-0.5 text-right font-medium">Operadora</th>
                      <th class="py-0.5 text-right font-medium">Máquina</th>
                      <th class="py-0.5 text-right font-medium">Dif.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="d in row.days" :key="d.date">
                      <td class="py-0.5">{{ d.date.slice(5) }}</td>
                      <td class="py-0.5 text-right">{{ d.registered }}</td>
                      <td class="py-0.5 text-right">{{ d.detected }}</td>
                      <td
                        class="py-0.5 text-right font-semibold"
                        :class="d.diff !== 0 ? 'text-orange-500' : ''"
                      >
                        {{ d.diff > 0 ? "+" : "" }}{{ d.diff }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <p class="mb-1 font-semibold">Caja (cierre diario)</p>
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
                  class="mt-1"
                  :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
                >
                  Si la operadora atiende varias máquinas, su cierre se reparte
                  en proporción a las monedas vendidas en cada una.
                </p>
              </div>

              <div class="grid grid-cols-3 gap-2">
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
                <div>
                  <p :class="isDark() ? 'text-zinc-500' : 'text-slate-400'">
                    Disponibles (operadora)
                  </p>
                  <p class="font-semibold">{{ row.available }}</p>
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
            <div class="text-right shrink-0 text-xs">
              <p
                class="font-semibold"
                :class="isDark() ? 'text-amber-300' : 'text-amber-700'"
              >
                Operadora $ {{ s.registeredUsd }}
              </p>
              <p :class="isDark() ? 'text-zinc-300' : 'text-zinc-600'">
                Máquina $ {{ s.detectedUsd }}
              </p>
              <p
                :class="
                  s.diffCoins !== 0
                    ? 'font-semibold text-orange-500'
                    : isDark()
                    ? 'text-zinc-500'
                    : 'text-slate-400'
                "
              >
                Dif. {{ signedUsd(s.diffUsd) }} · caja neta $ {{ s.netUsd }}
              </p>
            </div>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
