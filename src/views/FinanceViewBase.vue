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
      'min-h-screen px-3 py-4 sm:px-8 sm:py-6 space-y-6',
      isDark() ? 'bg-zinc-950' : 'bg-slate-100',
    ]"
  >
    <header
      class="flex flex-col gap-4 rounded-2xl border backdrop-blur-xl px-4 py-4 shadow-sm sm:px-8 sm:py-5"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-white'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border text-slate-500 transition cursor-pointer group overflow-hidden shrink-0"
            :class="
              isDark()
                ? 'border-zinc-700/70 hover:bg-transparent hover:text-white'
                : 'border-sky-300/80 hover:bg-transparent hover:text-sky-700'
            "
            aria-label="Abrir menú lateral"
            @click="sidebarOpen = true"
          >
            <img
              src="/img/icons/K11BOX.webp"
              alt="MachineHub logo"
              class="h-full w-full object-cover rounded-full transition-transform duration-200 group-hover:scale-105 group-hover:shadow-lg"
            />
          </button>
          <div class="min-w-0">
            <div class="flex flex-wrap items-baseline gap-2">
              <h1 class="text-xl font-semibold sm:text-2xl">Finanzas</h1>
              <span
                class="text-xs font-medium tracking-wide"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                Totales y analitica
              </span>
            </div>
            <p
              class="mt-1 text-sm"
              :class="isDark() ? 'text-zinc-300' : 'text-slate-500'"
            >
              Solo administradores
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full border transition cursor-pointer"
            :class="
              isDark()
                ? 'border-zinc-700/60 bg-zinc-950/20 text-zinc-100 hover:bg-zinc-950/30'
                : 'border-sky-300/80 bg-sky-50/70 text-sky-700 hover:bg-sky-50/90'
            "
            aria-label="Refrescar"
            title="Refrescar"
            @click="refreshPage"
          >
            <svg
              class="h-5 w-5"
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

    <section
      class="rounded-2xl border backdrop-blur-xl p-4 shadow-sm sm:p-6"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-zinc-100'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold">Total de monedas del dia</h2>
          <p
            class="text-xs"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Suma del total de monedas de cada maquina
          </p>
        </div>
        <label class="text-xs">
          <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >Fecha</span
          >
          <input
            v-model="allDate"
            type="date"
            class="mt-1 h-9 rounded-lg border px-2 text-xs outline-none"
            :class="
              isDark()
                ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            "
          />
        </label>
      </div>

      <div class="mt-3 text-2xl font-semibold">
        {{ loadingAll ? "..." : allTotalCoins }}
      </div>

      <div class="mt-4 space-y-2">
        <p
          class="text-xs"
          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
        >
          Detalle por maquina
        </p>
        <div v-if="!allRowsWithMachine.length" class="text-xs">
          Sin registros
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="row in allRowsWithMachine"
            :key="`${row.machineId}-${allDate}`"
            class="flex items-center justify-between rounded-xl border px-3 py-2"
            :class="
              isDark()
                ? 'border-zinc-800/70 bg-zinc-950/20'
                : 'border-slate-200 bg-white/70'
            "
          >
            <div class="min-w-0">
              <p class="text-xs font-semibold truncate">
                {{ row.machineName }}
              </p>
              <p
                class="text-[11px]"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                {{ row.machineLocation || "—" }}
              </p>
            </div>
            <div class="text-sm font-semibold">{{ row.coins }}</div>
          </div>
        </div>
      </div>
    </section>

    <section
      class="rounded-2xl border backdrop-blur-xl p-4 shadow-sm sm:p-6"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-zinc-100'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold">
            Total de monedas del dia por maquina
          </h2>
          <p
            class="text-xs"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Suma del total de monedas de la maquina seleccionada
          </p>
        </div>
        <div class="flex flex-wrap items-end gap-3">
          <label class="text-xs">
            <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >Maquina</span
            >
            <select
              v-model="selectedMachineId"
              class="app-select mt-1 h-9 rounded-lg border px-2 text-xs outline-none"
              :class="
                isDark()
                  ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              "
            >
              <option :value="null" disabled>Selecciona...</option>
              <option v-for="m in machineOptions" :key="m.id" :value="m.id">
                {{ m.label }}
              </option>
            </select>
          </label>
          <label class="text-xs">
            <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >Fecha</span
            >
            <input
              v-model="machineDate"
              type="date"
              class="mt-1 h-9 rounded-lg border px-2 text-xs outline-none"
              :class="
                isDark()
                  ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              "
            />
          </label>
        </div>
      </div>

      <div class="mt-3 text-2xl font-semibold">
        {{ loadingMachine ? "..." : machineTotalCoins }}
      </div>

      <div
        class="mt-2 text-xs"
        :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
      >
        {{ selectedMachine?.location || "—" }}
      </div>
    </section>

    <section
      class="rounded-2xl border backdrop-blur-xl p-4 shadow-sm sm:p-6"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-zinc-100'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold">Monedas del dia por supervisor</h2>
          <p
            class="text-xs"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Suma del total de monedas de sus maquinas
          </p>
        </div>
        <div class="flex flex-wrap items-end gap-3">
          <label class="text-xs">
            <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >Supervisor</span
            >
            <select
              v-model.number="selectedSupervisorId"
              class="app-select mt-1 h-9 rounded-lg border px-2 text-xs outline-none"
              :class="
                isDark()
                  ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              "
            >
              <option :value="null" disabled>Selecciona...</option>
              <option v-for="s in supervisorOptions" :key="s.id" :value="s.id">
                {{ s.label }}
              </option>
            </select>
          </label>
          <label class="text-xs">
            <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >Fecha</span
            >
            <input
              v-model="supervisorDate"
              type="date"
              class="mt-1 h-9 rounded-lg border px-2 text-xs outline-none"
              :class="
                isDark()
                  ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              "
            />
          </label>
        </div>
      </div>

      <div class="mt-3 text-2xl font-semibold">
        {{ loadingSupervisor ? "..." : supervisorTotalCoins }}
      </div>

      <div class="mt-4 space-y-2">
        <p
          class="text-xs"
          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
        >
          Maquinas del supervisor
        </p>
        <div v-if="!supervisorRowsWithMachine.length" class="text-xs">
          Sin registros
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="row in supervisorRowsWithMachine"
            :key="`${row.machineId}-${supervisorDate}`"
            class="flex items-center justify-between rounded-xl border px-3 py-2"
            :class="
              isDark()
                ? 'border-zinc-800/70 bg-zinc-950/20'
                : 'border-slate-200 bg-white/70'
            "
          >
            <div class="min-w-0">
              <p class="text-xs font-semibold truncate">
                {{ row.machineName }}
              </p>
              <p
                class="text-[11px]"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                {{ row.machineLocation || "—" }}
              </p>
            </div>
            <div class="text-sm font-semibold">{{ row.coins }}</div>
          </div>
        </div>
      </div>
    </section>

    <section
      class="rounded-2xl border backdrop-blur-xl p-4 shadow-sm sm:p-6"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-zinc-100'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold">Grafico de monedas por maquina</h2>
          <p
            class="text-xs"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Ver monedas por dia, semana o rango personalizado
          </p>
        </div>
        <div class="flex flex-col gap-3 w-full sm:w-auto">
          <label class="text-xs w-full sm:w-auto">
            <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >Maquina</span
            >
            <select
              v-model="chartMachineId"
              class="app-select mt-1 h-9 w-full rounded-lg border px-2 text-xs outline-none"
              :class="
                isDark()
                  ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              "
            >
              <option :value="null" disabled>Selecciona...</option>
              <option :value="ALL_MACHINES_ID">Todas las maquinas</option>
              <option v-for="m in machineOptions" :key="m.id" :value="m.id">
                {{ m.label }}
              </option>
            </select>
          </label>
          <label class="text-xs w-full sm:w-auto">
            <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >Desde</span
            >
            <input
              v-model="chartStartDate"
              type="date"
              class="mt-1 h-9 w-full rounded-lg border px-2 text-xs outline-none"
              :class="
                isDark()
                  ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              "
            />
          </label>
          <label class="text-xs w-full sm:w-auto">
            <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >Hasta</span
            >
            <input
              v-model="chartEndDate"
              type="date"
              class="mt-1 h-9 w-full rounded-lg border px-2 text-xs outline-none"
              :class="
                isDark()
                  ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              "
            />
          </label>
        </div>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="h-8 rounded-full border px-3 text-[11px] font-semibold transition"
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
          class="h-8 rounded-full border px-3 text-[11px] font-semibold transition"
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
          class="h-8 rounded-full border px-3 text-[11px] font-semibold transition"
          :class="
            isDark()
              ? 'border-zinc-700/60 bg-zinc-950/20 text-zinc-200 hover:bg-zinc-950/30'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          "
          @click="setChartRange(30)"
        >
          30 dias
        </button>
        <span
          class="text-[11px]"
          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
        >
          Total rango: {{ loadingChart ? "..." : chartTotalCoins }}
        </span>
      </div>

      <div class="mt-4 h-48">
        <div v-if="loadingChart" class="text-xs">Cargando...</div>
        <div v-else-if="!chartRows.length" class="text-xs">Sin registros</div>
        <BarChart
          v-else
          :chart-data="chartData"
          :chart-options="chartOptions"
        />
      </div>
    </section>
  </div>
</template>
