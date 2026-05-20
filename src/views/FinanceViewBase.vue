<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import { computed, onMounted, ref, watch } from "vue";
import { useTheme } from "@/composables/useTheme";
import { getMachineDailyIncome, getMachines, getUsers } from "@/api/client";
import { isSupervisorJobRole } from "@/utils/access";
import BarChart from "@/components/BarChart.vue";
import type { ChartDataset } from "chart.js";

type MachineRow = {
  id: string;
  name?: string;
  location?: string;
};

type MachineCoinsRow = {
  machineId: string;
  coins: number;
};

type UserRow = {
  id: number;
  name?: string;
  username?: string;
  role?: string;
  jobRole?: string;
  assignedMachineIds?: string[];
};

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;

const sidebarOpen = ref(false);

function formatYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map((v) => Number(v));
  return new Date(y, (m || 1) - 1, d || 1);
}

const todayYmd = () => formatYmd(new Date());

const allDate = ref<string>(todayYmd());
const machineDate = ref<string>(todayYmd());
const supervisorDate = ref<string>(todayYmd());
const chartStartDate = ref<string>(todayYmd());
const chartEndDate = ref<string>(todayYmd());
const ALL_MACHINES_ID = "all";

const machines = ref<MachineRow[]>([]);
const supervisors = ref<UserRow[]>([]);
const selectedMachineId = ref<string | null>(null);
const chartMachineId = ref<string | null>(null);
const selectedSupervisorId = ref<number | null>(null);

const loadingAll = ref(false);
const loadingMachine = ref(false);
const loadingSupervisor = ref(false);
const loadingChart = ref(false);

const allRows = ref<MachineCoinsRow[]>([]);
const supervisorRows = ref<MachineCoinsRow[]>([]);
const machineTotalCoins = ref(0);
const chartRows = ref<{ date: string; coins: number }[]>([]);

function addDaysYmd(ymd: string, days: number) {
  const date = parseYmd(ymd);
  date.setDate(date.getDate() + days);
  return formatYmd(date);
}

function getDateRangeArray(start: string, end: string) {
  const arr: string[] = [];
  let current = parseYmd(start);
  const last = parseYmd(end);
  while (current <= last) {
    arr.push(formatYmd(current));
    current.setDate(current.getDate() + 1);
  }
  return arr;
}

function setChartRange(days: number) {
  const end = todayYmd();
  chartEndDate.value = end;
  chartStartDate.value = addDaysYmd(end, -(days - 1));
}

function isSupervisorUser(u: UserRow): boolean {
  return isSupervisorJobRole(u.jobRole);
}

const machineMap = computed(() => {
  const map = new Map<string, MachineRow>();
  for (const m of machines.value) {
    map.set(String(m.id), m);
  }
  return map;
});

const machineOptions = computed(() => {
  return machines.value
    .map((m) => ({
      id: String(m.id),
      label: m?.name || String(m.id),
      location: m?.location || "",
    }))
    .sort((a, b) =>
      a.label.localeCompare(b.label, "es", { sensitivity: "base" })
    );
});

const selectedMachine = computed(() => {
  return machineOptions.value.find((m) => m.id === selectedMachineId.value);
});

const allCoinsByMachine = computed(() => {
  const map = new Map<string, number>();
  for (const row of allRows.value) {
    const id = String(row.machineId || "");
    if (!id) continue;
    map.set(id, (map.get(id) || 0) + (row.coins || 0));
  }
  return map;
});

const supervisorCoinsByMachine = computed(() => {
  const map = new Map<string, number>();
  for (const row of supervisorRows.value) {
    const id = String(row.machineId || "");
    if (!id) continue;
    map.set(id, (map.get(id) || 0) + (row.coins || 0));
  }
  return map;
});

const supervisorOptions = computed(() => {
  return supervisors.value
    .filter((u) => u.role !== "admin")
    .filter(isSupervisorUser)
    .map((u) => ({
      id: u.id,
      label: `${u.name || u.username || "Supervisor"}`,
      machineIds: (u.assignedMachineIds || []).map(String),
    }))
    .sort((a, b) =>
      a.label.localeCompare(b.label, "es", { sensitivity: "base" })
    );
});

const selectedSupervisor = computed(() =>
  supervisorOptions.value.find((s) => s.id === selectedSupervisorId.value)
);

const supervisorMachineIds = computed(() => {
  return new Set(selectedSupervisor.value?.machineIds || []);
});

const allMachineTotals = computed(() => {
  return machines.value.map((m) => ({
    machineId: String(m.id),
    machineName: m?.name || String(m.id),
    machineLocation: m?.location || "",
    coins: allCoinsByMachine.value.get(String(m.id)) || 0,
  }));
});

const supervisorMachineTotals = computed(() => {
  const allowed = supervisorMachineIds.value;
  return machines.value
    .filter((m) => allowed.has(String(m.id)))
    .map((m) => ({
      machineId: String(m.id),
      machineName: m?.name || String(m.id),
      machineLocation: m?.location || "",
      coins: supervisorCoinsByMachine.value.get(String(m.id)) || 0,
    }));
});

const allRowsWithMachine = computed(() =>
  allMachineTotals.value.filter((row) => row.coins > 0)
);

const supervisorRowsWithMachine = computed(() => supervisorMachineTotals.value);

const allTotalCoins = computed(() =>
  allMachineTotals.value.reduce((sum, row) => sum + row.coins, 0)
);

const supervisorTotalCoins = computed(() =>
  supervisorMachineTotals.value.reduce((sum, row) => sum + row.coins, 0)
);

const chartTotalCoins = computed(() =>
  chartRows.value.reduce((sum, row) => sum + row.coins, 0)
);

const chartData = computed(() => {
  const labels = chartRows.value.map((row) => row.date.slice(5));
  const dataset: ChartDataset<"bar", number[]> = {
    label: "Monedas",
    data: chartRows.value.map((row) => row.coins),
    borderRadius: 8,
    backgroundColor: isDark()
      ? "rgba(56, 189, 248, 0.35)"
      : "rgba(2, 132, 199, 0.35)",
    borderColor: isDark() ? "#38bdf8" : "#0284c7",
    borderWidth: 1,
  };

  return { labels, datasets: [dataset] };
});

const chartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: {
        ticks: {
          color: isDark() ? "#a1a1aa" : "#64748b",
          font: { size: 10 },
        },
        grid: {
          color: isDark() ? "rgba(39,39,42,0.4)" : "rgba(148,163,184,0.3)",
        },
      },
      y: {
        ticks: {
          color: isDark() ? "#a1a1aa" : "#64748b",
          font: { size: 10 },
          precision: 0,
        },
        grid: {
          color: isDark() ? "rgba(39,39,42,0.4)" : "rgba(148,163,184,0.3)",
        },
      },
    },
  };
});

async function loadMachines() {
  const rows = (await getMachines()) as MachineRow[];
  machines.value = (Array.isArray(rows) ? rows : []).map((m) => ({
    id: String(m.id),
    name: m.name,
    location: m.location ?? undefined,
  }));

  if (selectedMachineId.value === null && machineOptions.value.length) {
    selectedMachineId.value = machineOptions.value[0]?.id ?? null;
  }

  if (chartMachineId.value === null && machineOptions.value.length) {
    chartMachineId.value = selectedMachineId.value ?? null;
  }
}

async function loadSupervisors() {
  const rows = (await getUsers()) as UserRow[];
  supervisors.value = (Array.isArray(rows) ? rows : [])
    .filter((u) => u.role === "employee")
    .map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      role: u.role,
      jobRole: u.jobRole,
      assignedMachineIds: (u.assignedMachineIds || []).map(String),
    }));

  if (selectedSupervisorId.value === null && supervisorOptions.value.length) {
    selectedSupervisorId.value = supervisorOptions.value[0]?.id ?? null;
  }
}

async function loadAllCoins() {
  if (!allDate.value) return;
  loadingAll.value = true;
  try {
    const rows = await Promise.all(
      machines.value.map(async (m) => {
        try {
          const data = await getMachineDailyIncome(String(m.id), {
            startDate: allDate.value,
            endDate: allDate.value,
          });
          const coins = (Array.isArray(data) ? data : []).reduce(
            (sum, row) => sum + Number(row?.income ?? 0),
            0
          );
          return { machineId: String(m.id), coins };
        } catch {
          return { machineId: String(m.id), coins: 0 };
        }
      })
    );
    allRows.value = rows;
  } finally {
    loadingAll.value = false;
  }
}

async function loadSelectedMachineCoins() {
  if (!machineDate.value || !selectedMachineId.value) return;
  loadingMachine.value = true;
  try {
    const data = await getMachineDailyIncome(selectedMachineId.value, {
      startDate: machineDate.value,
      endDate: machineDate.value,
    });
    machineTotalCoins.value = (Array.isArray(data) ? data : []).reduce(
      (sum, row) => sum + Number(row?.income ?? 0),
      0
    );
  } catch {
    machineTotalCoins.value = 0;
  } finally {
    loadingMachine.value = false;
  }
}

async function loadChartCoins() {
  if (!chartStartDate.value || !chartEndDate.value) {
    chartRows.value = [];
    return;
  }
  const selectedId = chartMachineId.value;
  if (!selectedId) {
    chartRows.value = [];
    return;
  }
  loadingChart.value = true;
  try {
    const allDates = getDateRangeArray(
      chartStartDate.value,
      chartEndDate.value
    );
    const totalsByDate = new Map<string, number>();
    const machineIds =
      selectedId === ALL_MACHINES_ID
        ? machines.value.map((m) => String(m.id))
        : [selectedId];

    await Promise.all(
      machineIds.map(async (machineId) => {
        try {
          const data = await getMachineDailyIncome(machineId, {
            startDate: chartStartDate.value,
            endDate: chartEndDate.value,
          });
          for (const row of Array.isArray(data) ? data : []) {
            const date = row?.date ? String(row.date).slice(0, 10) : "";
            if (!date) continue;
            const coins = Number(row?.income ?? 0) || 0;
            totalsByDate.set(date, (totalsByDate.get(date) || 0) + coins);
          }
        } catch {
          // ignore per-machine errors
        }
      })
    );

    chartRows.value = allDates.map((date) => ({
      date,
      coins: totalsByDate.get(date) || 0,
    }));
  } finally {
    loadingChart.value = false;
  }
}

async function loadSupervisorCoins() {
  if (!supervisorDate.value) return;
  loadingSupervisor.value = true;
  try {
    const allowed = supervisorMachineIds.value;
    const rows = await Promise.all(
      machines.value
        .filter((m) => allowed.has(String(m.id)))
        .map(async (m) => {
          try {
            const data = await getMachineDailyIncome(String(m.id), {
              startDate: supervisorDate.value,
              endDate: supervisorDate.value,
            });
            const coins = (Array.isArray(data) ? data : []).reduce(
              (sum, row) => sum + Number(row?.income ?? 0),
              0
            );
            return { machineId: String(m.id), coins };
          } catch {
            return { machineId: String(m.id), coins: 0 };
          }
        })
    );
    supervisorRows.value = rows;
  } finally {
    loadingSupervisor.value = false;
  }
}

function refreshPage() {
  window.location.reload();
}

onMounted(async () => {
  const today = todayYmd();
  allDate.value = today;
  machineDate.value = today;
  supervisorDate.value = today;
  chartStartDate.value = today;
  chartEndDate.value = today;
  await Promise.all([loadMachines(), loadSupervisors()]);
  await loadAllCoins();
  await loadSelectedMachineCoins();
  await loadChartCoins();
  await loadSupervisorCoins();
});

watch([allDate], () => {
  void loadAllCoins();
});

watch([machineDate, selectedMachineId], () => {
  void loadSelectedMachineCoins();
});

watch([chartStartDate, chartEndDate, chartMachineId], () => {
  void loadChartCoins();
});

watch([supervisorDate, selectedSupervisorId], () => {
  void loadSupervisorCoins();
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
      'min-h-screen px-3 py-4 sm:px-6 lg:px-8 space-y-6',
      isDark() ? 'bg-zinc-950' : 'bg-slate-100',
    ]"
  >
    <header
      class="flex flex-col gap-4 rounded-2xl border backdrop-blur-xl px-4 py-4 shadow-sm sm:px-6 sm:py-5"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-white'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div class="flex items-center justify-between gap-3">
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
              alt="MachineHub logo"
              class="h-7 w-7 sm:h-8 sm:w-8 object-cover rounded-lg transition-transform duration-200 group-hover:scale-105"
            />
          </button>
          <div class="min-w-0">
            <h1
              class="text-lg sm:text-xl lg:text-2xl font-semibold leading-tight truncate"
            >
              Finanzas
            </h1>
            <p
              class="text-xs truncate"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              Totales y analitica
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border transition cursor-pointer shrink-0"
            :class="
              isDark()
                ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            "
            aria-label="Refrescar"
            title="Refrescar"
            @click="refreshPage"
          >
            <svg
              class="h-4 w-4 sm:h-5 sm:w-5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M21 12a9 9 0 1 1-3.27-6.93"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M21 3v6h-6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Filtros Globales -->
    <section
      class="rounded-2xl border backdrop-blur-xl p-4 shadow-sm sm:p-5"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-zinc-100'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div class="flex flex-col sm:flex-row sm:items-end gap-4">
        <div class="flex-1">
          <label
            class="block text-xs font-medium mb-1.5"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Fecha de consulta
          </label>
          <div class="relative">
            <input
              v-model="allDate"
              type="date"
              class="w-full h-10 rounded-xl border pl-3 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
              :class="
                isDark()
                  ? 'bg-zinc-950/40 border-zinc-700/60 text-white placeholder-zinc-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
              "
            />
          </div>
        </div>

        <div class="sm:w-48">
          <label
            class="block text-xs font-medium mb-1.5"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Total Global
          </label>
          <div
            class="h-10 flex items-center justify-center rounded-xl border text-lg font-semibold px-3"
            :class="
              isDark()
                ? 'bg-zinc-950/40 border-zinc-700/60 text-sky-400'
                : 'bg-sky-50/50 border-sky-200 text-sky-700'
            "
          >
            {{ loadingAll ? "..." : allTotalCoins }}
          </div>
        </div>
      </div>

      <div
        class="mt-4 pt-4 border-t"
        :class="isDark() ? 'border-zinc-800/60' : 'border-slate-200'"
      >
        <p
          class="text-xs font-medium mb-3"
          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
        >
          Detalle por maquina
        </p>
        <div
          v-if="!allRowsWithMachine.length"
          class="text-xs py-4 text-center"
          :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
        >
          Sin registros para esta fecha
        </div>
        <div
          v-else
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          <div
            v-for="row in allRowsWithMachine"
            :key="`${row.machineId}-${allDate}`"
            class="flex items-center justify-between rounded-xl border px-3 py-2.5 transition hover:shadow-sm"
            :class="
              isDark()
                ? 'border-zinc-800/70 bg-zinc-950/20 hover:bg-zinc-900/40'
                : 'border-slate-200 bg-white/70 hover:bg-white'
            "
          >
            <div class="min-w-0">
              <p class="text-sm font-semibold truncate">
                {{ row.machineName }}
              </p>
              <p
                class="text-xs"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                {{ row.machineLocation || "Sin ubicacion" }}
              </p>
            </div>
            <div class="text-sm font-bold ml-2">{{ row.coins }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Filtro por Maquina -->
    <section
      class="rounded-2xl border backdrop-blur-xl p-4 shadow-sm sm:p-5"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-zinc-100'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div class="flex flex-col sm:flex-row sm:items-end gap-4">
        <div class="flex-1">
          <label
            class="block text-xs font-medium mb-1.5"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Maquina
          </label>
          <div class="relative">
            <select
              v-model="selectedMachineId"
              class="w-full h-10 rounded-xl border pl-3 pr-8 text-sm outline-none transition focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 appearance-none"
              :class="
                isDark()
                  ? 'bg-zinc-950/40 border-zinc-700/60 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              "
            >
              <option :value="null" disabled>Selecciona una maquina...</option>
              <option v-for="m in machineOptions" :key="m.id" :value="m.id">
                {{ m.label }} {{ m.location ? `(${m.location})` : "" }}
              </option>
            </select>
            <div
              class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        <div class="sm:w-40">
          <label
            class="block text-xs font-medium mb-1.5"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Fecha
          </label>
          <input
            v-model="machineDate"
            type="date"
            class="w-full h-10 rounded-xl border pl-3 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            :class="
              isDark()
                ? 'bg-zinc-950/40 border-zinc-700/60 text-white placeholder-zinc-500'
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
            "
          />
        </div>

        <div class="sm:w-40">
          <label
            class="block text-xs font-medium mb-1.5"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Total Maquina
          </label>
          <div
            class="h-10 flex items-center justify-center rounded-xl border text-lg font-semibold px-3"
            :class="
              isDark()
                ? 'bg-zinc-950/40 border-zinc-700/60 text-emerald-400'
                : 'bg-emerald-50/50 border-emerald-200 text-emerald-700'
            "
          >
            {{ loadingMachine ? "..." : machineTotalCoins }}
          </div>
        </div>
      </div>

      <div
        class="mt-3 text-xs flex items-center gap-1.5"
        :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
      >
        <svg
          class="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        {{ selectedMachine?.location || "Ubicacion no disponible" }}
      </div>
    </section>

    <!-- Filtro por Supervisor -->
    <section
      class="rounded-2xl border backdrop-blur-xl p-4 shadow-sm sm:p-5"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-zinc-100'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div class="flex flex-col sm:flex-row sm:items-end gap-4">
        <div class="flex-1">
          <label
            class="block text-xs font-medium mb-1.5"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Supervisor
          </label>
          <div class="relative">
            <select
              v-model.number="selectedSupervisorId"
              class="w-full h-10 rounded-xl border pl-3 pr-8 text-sm outline-none transition focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 appearance-none"
              :class="
                isDark()
                  ? 'bg-zinc-950/40 border-zinc-700/60 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              "
            >
              <option :value="null" disabled>
                Selecciona un supervisor...
              </option>
              <option v-for="s in supervisorOptions" :key="s.id" :value="s.id">
                {{ s.label }}
              </option>
            </select>
            <div
              class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        <div class="sm:w-40">
          <label
            class="block text-xs font-medium mb-1.5"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Fecha
          </label>
          <input
            v-model="supervisorDate"
            type="date"
            class="w-full h-10 rounded-xl border pl-3 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            :class="
              isDark()
                ? 'bg-zinc-950/40 border-zinc-700/60 text-white placeholder-zinc-500'
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
            "
          />
        </div>

        <div class="sm:w-40">
          <label
            class="block text-xs font-medium mb-1.5"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Total Supervisor
          </label>
          <div
            class="h-10 flex items-center justify-center rounded-xl border text-lg font-semibold px-3"
            :class="
              isDark()
                ? 'bg-zinc-950/40 border-zinc-700/60 text-violet-400'
                : 'bg-violet-50/50 border-violet-200 text-violet-700'
            "
          >
            {{ loadingSupervisor ? "..." : supervisorTotalCoins }}
          </div>
        </div>
      </div>

      <div
        class="mt-4 pt-4 border-t"
        :class="isDark() ? 'border-zinc-800/60' : 'border-slate-200'"
      >
        <p
          class="text-xs font-medium mb-3"
          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
        >
          Maquinas del supervisor
        </p>
        <div
          v-if="!supervisorRowsWithMachine.length"
          class="text-xs py-4 text-center"
          :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
        >
          Sin registros para esta fecha
        </div>
        <div
          v-else
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          <div
            v-for="row in supervisorRowsWithMachine"
            :key="`${row.machineId}-${supervisorDate}`"
            class="flex items-center justify-between rounded-xl border px-3 py-2.5 transition hover:shadow-sm"
            :class="
              isDark()
                ? 'border-zinc-800/70 bg-zinc-950/20 hover:bg-zinc-900/40'
                : 'border-slate-200 bg-white/70 hover:bg-white'
            "
          >
            <div class="min-w-0">
              <p class="text-sm font-semibold truncate">
                {{ row.machineName }}
              </p>
              <p
                class="text-xs"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                {{ row.machineLocation || "Sin ubicacion" }}
              </p>
            </div>
            <div class="text-sm font-bold ml-2">{{ row.coins }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Grafico -->
    <section
      class="rounded-2xl border backdrop-blur-xl p-4 shadow-sm sm:p-5"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-zinc-100'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div class="flex flex-col lg:flex-row lg:items-end gap-4 mb-4">
        <div class="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              class="block text-xs font-medium mb-1.5"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              Maquina / Grupo
            </label>
            <div class="relative">
              <select
                v-model="chartMachineId"
                class="w-full h-10 rounded-xl border pl-3 pr-8 text-sm outline-none transition focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 appearance-none"
                :class="
                  isDark()
                    ? 'bg-zinc-950/40 border-zinc-700/60 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                "
              >
                <option :value="null" disabled>Selecciona...</option>
                <option :value="ALL_MACHINES_ID">Todas las maquinas</option>
                <option v-for="m in machineOptions" :key="m.id" :value="m.id">
                  {{ m.label }}
                </option>
              </select>
              <div
                class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <label
              class="block text-xs font-medium mb-1.5"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              Desde
            </label>
            <input
              v-model="chartStartDate"
              type="date"
              class="w-full h-10 rounded-xl border pl-3 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
              :class="
                isDark()
                  ? 'bg-zinc-950/40 border-zinc-700/60 text-white placeholder-zinc-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
              "
            />
          </div>
          <div>
            <label
              class="block text-xs font-medium mb-1.5"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              Hasta
            </label>
            <input
              v-model="chartEndDate"
              type="date"
              class="w-full h-10 rounded-xl border pl-3 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
              :class="
                isDark()
                  ? 'bg-zinc-950/40 border-zinc-700/60 text-white placeholder-zinc-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
              "
            />
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="h-9 rounded-xl border px-3 text-xs font-semibold transition"
            :class="
              isDark()
                ? 'border-zinc-700/60 bg-zinc-950/20 text-zinc-200 hover:bg-zinc-950/30'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            "
            @click="setChartRange(1)"
          >
            Hoy
          </button>
          <button
            type="button"
            class="h-9 rounded-xl border px-3 text-xs font-semibold transition"
            :class="
              isDark()
                ? 'border-zinc-700/60 bg-zinc-950/20 text-zinc-200 hover:bg-zinc-950/30'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            "
            @click="setChartRange(7)"
          >
            7 dias
          </button>
          <button
            type="button"
            class="h-9 rounded-xl border px-3 text-xs font-semibold transition"
            :class="
              isDark()
                ? 'border-zinc-700/60 bg-zinc-950/20 text-zinc-200 hover:bg-zinc-950/30'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            "
            @click="setChartRange(30)"
          >
            30 dias
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-semibold">Historico de monedas</h3>
        <span
          class="text-xs font-medium px-2 py-1 rounded-md"
          :class="
            isDark()
              ? 'bg-zinc-800/50 text-zinc-300'
              : 'bg-slate-100 text-slate-600'
          "
        >
          Total rango: {{ loadingChart ? "..." : chartTotalCoins }}
        </span>
      </div>

      <div
        class="h-64 sm:h-80 rounded-xl overflow-hidden border"
        :class="isDark() ? 'border-zinc-800/50' : 'border-slate-200'"
      >
        <div
          v-if="loadingChart"
          class="flex items-center justify-center h-full text-xs"
          :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
        >
          Cargando grafico...
        </div>
        <div
          v-else-if="!chartRows.length"
          class="flex items-center justify-center h-full text-xs"
          :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
        >
          Sin registros en este rango
        </div>
        <BarChart
          v-else
          :chart-data="chartData"
          :chart-options="chartOptions"
        />
      </div>
    </section>
  </div>
</template>
