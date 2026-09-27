<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { startVisiblePolling } from "@/utils/visiblePolling";
import { useRoute, useRouter } from "vue-router";
import {
  getDailySales,
  getMachineDailyIncome,
  getMachines,
  getMyTeamUsers,
  getUsers,
  updateMachine,
} from "@/api/client";
import { useCoinValues } from "@/composables/useCoinValues";
import { useCurrentUser } from "@/composables/useCurrentUser";
import { useTheme } from "@/composables/useTheme";
import { filterMachinesForRole } from "@/utils/access";
import {
  formatLocalYmd,
  formatTimeShort,
  getTodayLocalStr,
} from "@/utils/date";
import {
  getIncomeFromCoins,
  machineStatusDotClass,
  machineStatusLabel,
} from "@/utils/machine";
import type { Machine } from "@/types/machine";

type Sale = {
  employeeId?: number;
  employeeName?: string;
  employeeUsername?: string;
  date: string;
  coins: number;
  prizeBs?: number | null;
  recordMessage?: string | null;
};
type Person = { id: number; name: string; isSupervisor: boolean };
type Grouping = "dia" | "semana" | "mes";

const route = useRoute();
const router = useRouter();
const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;
const { currentRole, assignedMachineIds, roleKind, capabilities } =
  useCurrentUser();
const { coinValues } = useCoinValues();

const machine = ref<Machine | null>(null);
const todayCoins = ref(0);
const todayRegistered = ref(0);
const coinsByDate = ref<Record<string, number>>({});
const sales = ref<Sale[]>([]);
const people = ref<Person[]>([]);
const loadingHistory = ref(false);
const menuOpen = ref(false);
const expandedKey = ref<string | null>(null);

const grouping = ref<Grouping>("dia");

const todayStr = () => getTodayLocalStr();

// Cada vista tiene su propio rango fijo, así lo que se ve siempre concuerda:
//  Día: los 30 días anteriores a hoy · Semana: 8 semanas · Mes: 6 meses.
const range = computed(() => {
  const today = new Date();
  if (grouping.value === "dia") {
    const start = new Date(today);
    start.setDate(today.getDate() - 30);
    const end = new Date(today);
    end.setDate(today.getDate() - 1);
    return { start: formatLocalYmd(start), end: formatLocalYmd(end) };
  }
  if (grouping.value === "semana") {
    const start = mondayOf(formatLocalYmd(today));
    start.setDate(start.getDate() - 7 * 7);
    return { start: formatLocalYmd(start), end: formatLocalYmd(today) };
  }
  const start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  return { start: formatLocalYmd(start), end: formatLocalYmd(today) };
});
const startDate = computed(() => range.value.start);
const endDate = computed(() => range.value.end);

const periodLabel = computed(() =>
  grouping.value === "dia"
    ? "Últimos 30 días (sin contar hoy)"
    : grouping.value === "semana"
    ? "Últimas 8 semanas"
    : "Últimos 6 meses"
);

function income(coins: number): number {
  coinValues.value;
  const m = machine.value;
  if (!m) return 0;
  return Math.round(getIncomeFromCoins(coins, m.name, m.type) * 100) / 100;
}

const todayIncome = computed(() => income(todayRegistered.value));
const todayDiff = computed(() => todayCoins.value - todayRegistered.value);

const stateText = computed(() => {
  const m = machine.value;
  if (!m) return "";
  if (m.status === "maintenance") return "En mantenimiento";
  if (m.status === "active") {
    const t = formatTimeShort(m.last_on);
    return t ? `Encendida ${t}` : "Encendida";
  }
  const t = formatTimeShort(m.last_off);
  return t ? `Apagada ${t}` : "Apagada";
});

function ymd(v: unknown): string {
  return String(v ?? "").slice(0, 10);
}

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function parse(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}

function dayLabel(d: string): string {
  if (d === todayStr()) return "Hoy";
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (d === formatLocalYmd(y)) return "Ayer";
  const dt = parse(d);
  return `${WEEKDAYS[dt.getDay()]} ${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
}

function mondayOf(d: string): Date {
  const dt = parse(d);
  const diff = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - diff);
  return dt;
}

type Row = {
  key: string;
  label: string;
  coins: number;
  registered: number;
  entries: Sale[];
};

const dayRows = computed<Row[]>(() => {
  const list: Row[] = [];
  if (!startDate.value || !endDate.value) return list;
  const cur = parse(endDate.value);
  const first = parse(startDate.value);
  while (cur >= first && list.length < 400) {
    const key = formatLocalYmd(cur);
    const entries = sales.value.filter((s) => s.date === key);
    list.push({
      key,
      label: dayLabel(key),
      coins: coinsByDate.value[key] || 0,
      registered: entries.reduce((s, e) => s + e.coins, 0),
      entries,
    });
    cur.setDate(cur.getDate() - 1);
  }
  return list;
});

const rows = computed<Row[]>(() => {
  if (grouping.value === "dia") {
    return dayRows.value.filter((r) => r.coins > 0 || r.registered > 0);
  }
  const groups = new Map<string, Row>();
  for (const r of dayRows.value) {
    let key: string;
    let label: string;
    if (grouping.value === "semana") {
      const mon = mondayOf(r.key);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      key = formatLocalYmd(mon);
      label = `Semana ${mon.getDate()} ${
        MONTHS[mon.getMonth()]
      } – ${sun.getDate()} ${MONTHS[sun.getMonth()]}`;
    } else {
      key = r.key.slice(0, 7);
      const dt = parse(r.key);
      label = `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
    }
    const g = groups.get(key) || {
      key,
      label,
      coins: 0,
      registered: 0,
      entries: [],
    };
    g.coins += r.coins;
    g.registered += r.registered;
    groups.set(key, g);
  }
  const thisWeek = formatLocalYmd(mondayOf(todayStr()));
  const lastWeekDate = mondayOf(todayStr());
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastWeek = formatLocalYmd(lastWeekDate);
  const thisMonth = todayStr().slice(0, 7);
  return Array.from(groups.values())
    .filter((g) => g.coins > 0 || g.registered > 0)
    .map((g) => {
      if (grouping.value === "semana" && g.key === thisWeek) {
        return { ...g, label: "Esta semana" };
      }
      if (grouping.value === "semana" && g.key === lastWeek) {
        return { ...g, label: "Semana pasada" };
      }
      if (grouping.value === "mes" && g.key === thisMonth) {
        return { ...g, label: "Este mes" };
      }
      return g;
    });
});

const totals = computed(() => {
  const coins = dayRows.value.reduce((s, r) => s + r.coins, 0);
  const registered = dayRows.value.reduce((s, r) => s + r.registered, 0);
  return { coins, registered, money: income(registered) };
});

function toggleRow(row: Row) {
  if (grouping.value !== "dia" || row.entries.length === 0) return;
  expandedKey.value = expandedKey.value === row.key ? null : row.key;
}

function operatorsLine(row: Row): string {
  if (row.entries.length === 0) {
    return row.coins > 0 ? "Sin registro de la operadora" : "";
  }
  return row.entries
    .map(
      (e) =>
        `${(e.employeeName || e.employeeUsername || "").split(" ")[0]} ${
          e.coins
        }`
    )
    .join(" · ");
}

async function loadMachine() {
  // Si ya nos fuimos de esta ruta (p. ej. a la ficha de una operadora) no hay
  // nada que cargar ni a dónde "corregir": salir de la página no es un error.
  const routeId = String(route.params.id || "");
  if (!routeId) return;
  let raw: Machine[];
  try {
    raw = (await getMachines()) as Machine[];
  } catch {
    return; // sin red: conservar lo que ya se ve
  }
  if (String(route.params.id || "") !== routeId) return;
  const all = (Array.isArray(raw) ? raw : []).map((m) => ({
    ...m,
    id: String(m.id),
  }));
  const allowed = filterMachinesForRole(all, {
    role: currentRole.value,
    assignedMachineIds: assignedMachineIds.value,
  });
  const current = allowed.find(
    (m) => m.name === routeId || String(m.id) === routeId
  );
  if (!current) {
    // Solo se expulsa al abrir la ficha; en las actualizaciones automáticas
    // un dato momentáneamente ausente no debe sacarte de la pantalla.
    if (!machine.value) router.replace({ name: "dashboard" });
    return;
  }
  machine.value = current;
}

async function loadToday() {
  const m = machine.value;
  if (!m) return;
  const today = todayStr();
  try {
    const [income, reg] = await Promise.all([
      getMachineDailyIncome(m.id, { startDate: today, endDate: today }),
      getDailySales({ machineId: m.id, startDate: today, endDate: today }),
    ]);
    todayCoins.value = (Array.isArray(income) ? income : []).reduce(
      (s, r) => s + (Number(r?.income) || 0),
      0
    );
    todayRegistered.value = (Array.isArray(reg) ? reg : []).reduce(
      (s, r) => s + (Number(r?.coins) || 0),
      0
    );
  } catch {
    todayCoins.value = 0;
    todayRegistered.value = 0;
  }
}

async function loadHistory() {
  const m = machine.value;
  if (!m || !startDate.value || !endDate.value) return;
  if (startDate.value > endDate.value) return;
  loadingHistory.value = true;
  try {
    const [inc, reg] = await Promise.all([
      getMachineDailyIncome(m.id, {
        startDate: startDate.value,
        endDate: endDate.value,
      }),
      getDailySales({
        machineId: m.id,
        startDate: startDate.value,
        endDate: endDate.value,
      }),
    ]);
    const map: Record<string, number> = {};
    for (const r of Array.isArray(inc) ? inc : []) {
      const d = ymd(r?.date);
      if (d) map[d] = (map[d] || 0) + (Number(r?.income) || 0);
    }
    coinsByDate.value = map;
    sales.value = (Array.isArray(reg) ? reg : []).map((r) => ({
      employeeId: Number(r?.employeeId) || undefined,
      employeeName: r?.employeeName,
      employeeUsername: r?.employeeUsername,
      date: ymd(r?.date),
      coins: Number(r?.coins) || 0,
      prizeBs: r?.prizeBs,
      recordMessage: r?.recordMessage,
    }));
  } catch {
    coinsByDate.value = {};
    sales.value = [];
  } finally {
    loadingHistory.value = false;
  }
}

async function loadPeople() {
  const m = machine.value;
  if (!m) return;
  try {
    const list =
      roleKind.value === "supervisor"
        ? await getMyTeamUsers()
        : await getUsers();
    people.value = (Array.isArray(list) ? list : [])
      .filter(
        (u: { role?: string; assignedMachineIds?: unknown[] }) =>
          u.role === "employee" &&
          (u.assignedMachineIds || []).map(String).includes(m.id)
      )
      .map(
        (u: {
          id: number;
          name?: string;
          username: string;
          jobRole?: string;
        }) => ({
          id: u.id,
          name: u.name || u.username,
          isSupervisor: String(u.jobRole || "")
            .toLowerCase()
            .includes("supervisor"),
        })
      )
      .sort(
        (a: Person, b: Person) =>
          Number(a.isSupervisor) - Number(b.isSupervisor)
      );
  } catch {
    people.value = [];
  }
}

function openPerson(p: Person) {
  if (p.isSupervisor) return;
  router.push({
    name: "employee-report-detail",
    params: { employeeId: String(p.id) },
    query: { employeeName: p.name },
  });
}

async function toggleMaintenance() {
  const m = machine.value;
  menuOpen.value = false;
  if (!m) return;
  const next = m.status === "maintenance" ? "inactive" : "maintenance";
  try {
    await updateMachine(m.id, { status: next });
    await loadMachine();
  } catch (e) {
    console.error("Error cambiando estado:", e);
  }
}

function goBack() {
  if (window.history.state?.back) router.back();
  else router.push({ name: "dashboard" });
}

function closeMenu(e: MouseEvent) {
  if (!(e.target as HTMLElement | null)?.closest("[data-detail-menu]")) {
    menuOpen.value = false;
  }
}

let stopPolling: (() => void) | undefined;
let disposed = false;

async function refreshAll() {
  await loadMachine();
  await Promise.all([loadToday(), loadHistory()]);
}

onMounted(async () => {
  window.addEventListener("click", closeMenu, true);
  await loadMachine();
  await Promise.all([loadToday(), loadHistory(), loadPeople()]);
  if (disposed) return;
  stopPolling = startVisiblePolling(() => refreshAll(), 30000);
});

onUnmounted(() => {
  disposed = true;
  window.removeEventListener("click", closeMenu, true);
  stopPolling?.();
});

watch([startDate, endDate], () => {
  expandedKey.value = null;
  void loadHistory();
});

watch(
  () => route.params.id,
  async (id) => {
    if (!id) return;
    machine.value = null;
    await loadMachine();
    await Promise.all([loadToday(), loadHistory(), loadPeople()]);
  }
);

const groupings: { k: Grouping; l: string }[] = [
  { k: "dia", l: "Por día" },
  { k: "semana", l: "Por semana" },
  { k: "mes", l: "Por mes" },
];
</script>

<template>
  <div
    class="min-h-screen space-y-3 px-3 py-3 sm:px-6 sm:py-6"
    :class="
      isDark() ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-100 text-slate-900'
    "
  >
    <header
      class="flex items-center gap-2 rounded-2xl border px-3 py-2.5 shadow-sm"
      :class="
        isDark()
          ? 'border-zinc-800/70 bg-zinc-900/70'
          : 'border-slate-200/70 bg-white/70'
      "
    >
      <button
        type="button"
        class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
        :class="isDark() ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'"
        aria-label="Volver a Máquinas"
        @click="goBack"
      >
        ←
      </button>
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-lg font-semibold leading-tight">
          {{ machine?.name || "Máquina" }}
        </h1>
        <p
          class="flex items-center gap-1.5 truncate text-xs"
          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
        >
          <span
            class="h-2 w-2 shrink-0 rounded-full"
            :class="machineStatusDotClass(machine?.status || 'inactive')"
            :title="machineStatusLabel(machine?.status || 'inactive')"
          ></span>
          <span class="truncate"
            >{{ machine?.location || "Sin ubicación" }} · {{ stateText }}</span
          >
        </p>
      </div>
      <div
        v-if="capabilities.canEditMachineStatus"
        class="relative"
        data-detail-menu
      >
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl leading-none"
          :class="isDark() ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'"
          aria-label="Opciones"
          @click.stop="menuOpen = !menuOpen"
        >
          ⋯
        </button>
        <div
          v-if="menuOpen"
          class="absolute right-0 top-11 z-30 w-56 rounded-xl border py-1 text-sm shadow-xl"
          :class="
            isDark()
              ? 'border-zinc-800 bg-zinc-950'
              : 'border-slate-200 bg-white text-slate-700'
          "
        >
          <button
            type="button"
            class="block w-full px-3 py-2.5 text-left hover:bg-slate-500/10"
            @click="toggleMaintenance"
          >
            {{
              machine?.status === "maintenance"
                ? "Quitar mantenimiento"
                : "Poner en mantenimiento"
            }}
          </button>
        </div>
      </div>
    </header>

    <section
      class="rounded-2xl border px-4 py-4 shadow-sm"
      :class="
        isDark()
          ? 'border-zinc-800/70 bg-zinc-900/70'
          : 'border-slate-200/70 bg-white/70'
      "
      aria-label="Hoy"
    >
      <p
        class="text-xs font-medium uppercase tracking-wide"
        :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
      >
        Hoy
      </p>
      <p class="mt-1 text-4xl font-semibold leading-none">
        $ {{ todayIncome }}
      </p>
      <div class="mt-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <p
            class="text-lg font-semibold leading-none"
            :class="isDark() ? 'text-teal-300' : 'text-teal-600'"
          >
            {{ todayRegistered }}
          </p>
          <p
            class="mt-1 text-[11px]"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            registró la operadora
          </p>
        </div>
        <div>
          <p
            class="text-lg font-semibold leading-none"
            :class="isDark() ? 'text-sky-300' : 'text-sky-600'"
          >
            {{ todayCoins }}
          </p>
          <p
            class="mt-1 text-[11px]"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            contó la máquina
          </p>
        </div>
        <div>
          <p
            class="text-lg font-semibold leading-none"
            :class="
              todayDiff === 0
                ? ''
                : isDark()
                ? 'text-amber-300'
                : 'text-amber-600'
            "
          >
            {{ todayDiff > 0 ? "+" : "" }}{{ todayDiff }}
          </p>
          <p
            class="mt-1 text-[11px]"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            diferencia
          </p>
        </div>
      </div>
    </section>

    <section
      class="rounded-2xl border px-3 py-3 shadow-sm sm:px-4"
      :class="
        isDark()
          ? 'border-zinc-800/70 bg-zinc-900/70'
          : 'border-slate-200/70 bg-white/70'
      "
      aria-label="Historial"
    >
      <div class="space-y-2">
        <h2 class="text-sm font-semibold">Historial</h2>
        <div
          class="grid grid-cols-3 rounded-full border p-0.5 text-center text-xs"
          :class="isDark() ? 'border-zinc-700/60' : 'border-slate-200'"
        >
          <button
            v-for="g in groupings"
            :key="g.k"
            type="button"
            class="rounded-full px-3 py-1.5 font-medium"
            :class="
              grouping === g.k
                ? isDark()
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'bg-sky-500 text-white'
                : isDark()
                ? 'text-zinc-300'
                : 'text-slate-600'
            "
            @click="
              grouping = g.k;
              expandedKey = null;
            "
          >
            {{ g.l }}
          </button>
        </div>
      </div>

      <p
        class="mt-3 rounded-lg px-3 py-2 text-xs"
        :class="isDark() ? 'bg-zinc-800/60' : 'bg-slate-100'"
      >
        {{ periodLabel }}: <strong>$ {{ totals.money }}</strong> ·
        {{ totals.registered }} monedas registradas · la máquina contó
        {{ totals.coins }}
      </p>

      <p
        v-if="loadingHistory"
        class="py-4 text-sm"
        :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
      >
        Cargando…
      </p>
      <p
        v-else-if="rows.length === 0"
        class="py-4 text-sm"
        :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
      >
        No hubo ventas en este período.
      </p>

      <ul
        v-else
        class="mt-1 divide-y"
        :class="isDark() ? 'divide-zinc-800/70' : 'divide-slate-200/70'"
      >
        <li v-for="row in rows" :key="row.key">
          <button
            type="button"
            class="flex w-full items-center gap-3 py-3 text-left"
            :class="
              grouping === 'dia' && row.entries.length ? '' : 'cursor-default'
            "
            @click="toggleRow(row)"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold">{{ row.label }}</p>
              <p
                v-if="grouping === 'dia'"
                class="truncate text-xs"
                :class="
                  row.entries.length === 0
                    ? isDark()
                      ? 'text-amber-300'
                      : 'text-amber-600'
                    : isDark()
                    ? 'text-zinc-400'
                    : 'text-slate-500'
                "
              >
                {{ operatorsLine(row) }}
              </p>
              <p
                v-else
                class="text-xs"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                la máquina contó {{ row.coins }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-base font-semibold">
                $ {{ income(row.registered) }}
              </p>
              <p class="mt-1 flex flex-wrap items-center justify-end gap-1">
                <span
                  class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  :class="
                    isDark()
                      ? 'bg-teal-500/15 text-teal-300'
                      : 'bg-teal-50 text-teal-700'
                  "
                >
                  Operadora {{ row.registered }}
                </span>
                <span
                  class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  :class="
                    isDark()
                      ? 'bg-sky-500/15 text-sky-300'
                      : 'bg-sky-50 text-sky-700'
                  "
                >
                  Máquina {{ row.coins }}
                </span>
              </p>
            </div>
            <span
              v-if="grouping === 'dia'"
              class="w-3 text-center"
              :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
              aria-hidden="true"
              >{{
                row.entries.length ? (expandedKey === row.key ? "▴" : "▾") : ""
              }}</span
            >
          </button>

          <div
            v-if="expandedKey === row.key"
            class="mb-3 space-y-2 rounded-xl px-3 py-2"
            :class="isDark() ? 'bg-zinc-800/50' : 'bg-slate-100'"
          >
            <div v-for="(e, i) in row.entries" :key="i" class="text-sm">
              <div class="flex items-center justify-between gap-2">
                <button
                  type="button"
                  class="truncate text-left font-medium underline-offset-2 hover:underline"
                  @click="
                    openPerson({
                      id: e.employeeId || 0,
                      name: e.employeeName || '',
                      isSupervisor: !e.employeeId,
                    })
                  "
                >
                  {{ e.employeeName || e.employeeUsername || "Operadora" }}
                </button>
                <span class="shrink-0 text-xs">
                  {{ e.coins }} monedas
                  <span v-if="e.prizeBs"> · Bs {{ e.prizeBs }}</span>
                </span>
              </div>
              <p
                v-if="e.recordMessage"
                class="text-xs"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                “{{ e.recordMessage }}”
              </p>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <section
      v-if="people.length"
      class="rounded-2xl border px-3 py-3 shadow-sm sm:px-4"
      :class="
        isDark()
          ? 'border-zinc-800/70 bg-zinc-900/70'
          : 'border-slate-200/70 bg-white/70'
      "
      aria-label="Equipo asignado"
    >
      <h2 class="text-sm font-semibold">Equipo de esta máquina</h2>
      <ul
        class="mt-1 divide-y"
        :class="isDark() ? 'divide-zinc-800/70' : 'divide-slate-200/70'"
      >
        <li v-for="p in people" :key="p.id">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-2 py-2.5 text-left"
            :disabled="p.isSupervisor"
            @click="openPerson(p)"
          >
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium">{{
                p.name
              }}</span>
              <span
                class="block text-xs"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >{{ p.isSupervisor ? "Supervisor" : "Operadora" }}</span
              >
            </span>
            <span
              v-if="!p.isSupervisor"
              class="shrink-0 text-xs font-medium"
              :class="isDark() ? 'text-sky-300' : 'text-sky-600'"
              >Ver reportes ›</span
            >
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
