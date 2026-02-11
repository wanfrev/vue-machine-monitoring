<script setup lang="ts">
/* global defineProps */
import AppSidebar from "@/components/AppSidebar.vue";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useTheme } from "@/composables/useTheme";
import {
  getDailySales,
  getWeeklyReports,
  upsertWeeklyReport,
} from "@/api/client";

type WeeklyReportRow = {
  id?: number;
  employeeId?: number;
  employeeUsername?: string;
  employeeName?: string;
  weekEndDate: string;
  boxeoCoins: number;
  boxeoLost: number;
  boxeoReturned: number;
  agilidadCoins: number;
  agilidadLost: number;
  agilidadReturned: number;
  remainingCoins: number;
  pagoMovil: number;
  dolares: number;
  bolivares: number;
  premio: number;
  total: number;
  updatedAt?: string;
};

type Props = {
  canViewReportsList: boolean;
  roleKind: string;
  assignedMachineIds: string[];
  title?: string;
  subtitle?: string;
  reportKindLabel?: string;
  reportKindPlural?: string;
  showTabs?: boolean;
  activeTab?: "sales" | "daily";
};

const props = defineProps<Props>();

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;

const sidebarOpen = ref(false);
const saving = ref(false);

const canViewReportsList = computed(() => props.canViewReportsList);
const reportKindLabel = computed(() =>
  (props.reportKindLabel || "semanal").trim()
);
const reportKindPlural = computed(() =>
  (props.reportKindPlural || "semanales").trim()
);
const headerTitle = computed(() => props.title?.trim() || "Reportes");
const headerSubtitle = computed(
  () => props.subtitle?.trim() || `Cierre ${reportKindLabel.value}`
);
const headerDateFallback = computed(() => `Cierre ${reportKindLabel.value}`);
const saveButtonLabel = computed(
  () => `Guardar reporte ${reportKindLabel.value}`
);
const showTabs = computed(() => Boolean(props.showTabs));
const activeTab = computed(() => props.activeTab || "daily");
const isDailyReport = computed(() => reportKindLabel.value === "diario");

const loadingList = ref(false);
const listError = ref<string>("");
const reports = ref<WeeklyReportRow[]>([]);
const query = ref<string>("");
const router = useRouter();

const todayYmd = (date?: Date) =>
  (date ?? new Date()).toISOString().slice(0, 10);

const weekEndDate = ref<string>(todayYmd());

// Boxeo
const boxeoCoins = ref<number | null>(null);
const boxeoLost = ref<number | null>(null);
const boxeoReturned = ref<number | null>(null);

// Agilidad
const agilidadCoins = ref<number | null>(null);
const agilidadLost = ref<number | null>(null);
const agilidadReturned = ref<number | null>(null);

// Totales / pagos
const remainingCoins = ref<number | null>(null);
const pagoMovil = ref<number | null>(null);
const dolares = ref<number | null>(null);
const bolivares = ref<number | null>(null);
const premio = ref<number | null>(null);
const total = ref<number | null>(null);
const loadingCoins = ref(false);

type DailySaleRow = {
  machineType?: string | null;
  machine_type?: string | null;
  coins?: number | null;
  returned?: number | null;
  lost?: number | null;
};

function apiErrorMessage(e: unknown): string {
  const msg = (e as { response?: { data?: { message?: string } } })?.response
    ?.data?.message;
  return msg || "Ocurrió un error";
}

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord | null {
  if (typeof v !== "object" || v === null) return null;
  return v as UnknownRecord;
}

function pick(rec: UnknownRecord, keys: string[]): unknown {
  for (const k of keys) {
    if (k in rec) return rec[k];
  }
  return undefined;
}

function normalizeReport(row: unknown): WeeklyReportRow {
  const rec = asRecord(row) ?? {};

  const weekEndDate = String(pick(rec, ["weekEndDate", "week_end_date"]) ?? "");
  const employeeUsername = pick(rec, ["employeeUsername", "employee_username"]);
  const employeeName = pick(rec, ["employeeName", "employee_name"]);
  const employeeIdValue = pick(rec, ["employeeId", "employee_id"]);
  const updatedAt = pick(rec, ["updatedAt", "updated_at"]);

  return {
    id: typeof rec.id === "number" ? rec.id : undefined,
    employeeId:
      typeof employeeIdValue === "number" ? employeeIdValue : undefined,
    employeeUsername:
      typeof employeeUsername === "string" ? employeeUsername : undefined,
    employeeName: typeof employeeName === "string" ? employeeName : undefined,
    weekEndDate,
    boxeoCoins: toNum(pick(rec, ["boxeoCoins", "boxeo_coins"])),
    boxeoLost: toNum(pick(rec, ["boxeoLost", "boxeo_lost"])),
    boxeoReturned: toNum(pick(rec, ["boxeoReturned", "boxeo_returned"])),
    agilidadCoins: toNum(pick(rec, ["agilidadCoins", "agilidad_coins"])),
    agilidadLost: toNum(pick(rec, ["agilidadLost", "agilidad_lost"])),
    agilidadReturned: toNum(
      pick(rec, ["agilidadReturned", "agilidad_returned"])
    ),
    remainingCoins: toNum(pick(rec, ["remainingCoins", "remaining_coins"])),
    pagoMovil: toNum(pick(rec, ["pagoMovil", "pago_movil"])),
    dolares: toNum(pick(rec, ["dolares"])),
    bolivares: toNum(pick(rec, ["bolivares"])),
    premio: toNum(pick(rec, ["premio"])),
    total: toNum(pick(rec, ["total"])),
    updatedAt: typeof updatedAt === "string" ? updatedAt : undefined,
  };
}

async function loadWeeklyReportsList() {
  if (!canViewReportsList.value) return;
  loadingList.value = true;
  listError.value = "";
  try {
    const rows = await getWeeklyReports();
    reports.value = (Array.isArray(rows) ? rows : []).map((r) =>
      normalizeReport(r)
    );
  } catch (e) {
    listError.value = apiErrorMessage(e);
    reports.value = [];
  } finally {
    loadingList.value = false;
  }
}

function parseReportDate(value: string): Date | null {
  if (!value) return null;
  const ymd = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function weekdayEs(dateYmd: string): string {
  const dt = parseReportDate(dateYmd);
  if (!dt) return "";
  return capitalize(
    new Intl.DateTimeFormat("es-VE", { weekday: "long" }).format(dt)
  );
}

function ddmmyyyy(dateYmd: string): string {
  const dt = parseReportDate(dateYmd);
  if (!dt) return "";
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dt);
}

function openReport(row: WeeklyReportRow) {
  const reportKindQuery =
    reportKindLabel.value === "diario" ? { reportKind: "diario" } : {};
  if (typeof row.id === "number") {
    router.push({
      name: "report-detail",
      params: { reportId: row.id },
      query: reportKindQuery,
    });
    return;
  }

  router.push({
    name: "report-detail",
    query: {
      weekEndDate: row.weekEndDate,
      employeeId: row.employeeId ? String(row.employeeId) : "",
      employeeUsername: row.employeeUsername || "",
      ...reportKindQuery,
    },
  });
}

function addDaysYmd(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map((v) => Number(v));
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() + days);
  return todayYmd(date);
}

function getMachineType(row: DailySaleRow): string {
  const raw = row.machineType ?? row.machine_type ?? "";
  return String(raw).toLowerCase();
}

async function loadWeeklyCoins() {
  if (canViewReportsList.value) return;
  if (!weekEndDate.value) return;

  const startDate = addDaysYmd(weekEndDate.value, -6);
  loadingCoins.value = true;
  try {
    const rows = (await getDailySales({
      startDate,
      endDate: weekEndDate.value,
    })) as DailySaleRow[];

    let boxeo = 0;
    let agilidad = 0;
    let boxeoDevueltas = 0;
    let agilidadPerdidas = 0;
    let agilidadDevueltas = 0;
    for (const row of rows) {
      const coins = Number(row.coins ?? 0);
      if (!Number.isFinite(coins)) continue;
      const type = getMachineType(row);
      if (type.includes("boxeo")) {
        boxeo += coins;
        boxeoDevueltas += Number(row.returned ?? 0) || 0;
      } else if (type.includes("agilidad")) {
        agilidad += coins;
        agilidadPerdidas += Number(row.lost ?? 0) || 0;
        agilidadDevueltas += Number(row.returned ?? 0) || 0;
      }
    }

    boxeoCoins.value = boxeo;
    agilidadCoins.value = agilidad;
    boxeoReturned.value = boxeoDevueltas;
    agilidadLost.value = agilidadPerdidas;
    agilidadReturned.value = agilidadDevueltas;
  } catch (e) {
    boxeoCoins.value = 0;
    agilidadCoins.value = 0;
  } finally {
    loadingCoins.value = false;
  }
}

const headerDateLabel = computed(() => {
  const w = weekdayEs(weekEndDate.value);
  const f = ddmmyyyy(weekEndDate.value);
  return [w, f].filter(Boolean).join(" ");
});

const filteredReports = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return reports.value;
  return reports.value.filter((r) => {
    const name = String(r.employeeName || "").toLowerCase();
    const username = String(r.employeeUsername || "").toLowerCase();
    const dateLabel = `${weekdayEs(r.weekEndDate)} ${ddmmyyyy(
      r.weekEndDate
    )}`.toLowerCase();
    return (
      name.includes(q) ||
      username.includes(q) ||
      String(r.weekEndDate || "")
        .toLowerCase()
        .includes(q) ||
      dateLabel.includes(q)
    );
  });
});

function toNonNegInt(value: number | null): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.trunc(n);
}

function toNonNegMoney(value: number | null): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

async function saveWeekly() {
  if (!weekEndDate.value) {
    window.alert("Selecciona la fecha de cierre");
    return;
  }

  saving.value = true;
  try {
    const payload: WeeklyReportRow = {
      weekEndDate: weekEndDate.value,
      boxeoCoins: toNonNegInt(boxeoCoins.value),
      boxeoLost: toNonNegInt(boxeoLost.value),
      boxeoReturned: toNonNegInt(boxeoReturned.value),
      agilidadCoins: toNonNegInt(agilidadCoins.value),
      agilidadLost: toNonNegInt(agilidadLost.value),
      agilidadReturned: toNonNegInt(agilidadReturned.value),
      remainingCoins: 0,
      pagoMovil: 0,
      dolares: 0,
      bolivares: 0,
      premio: 0,
      total: 0,
    };

    if (!isDailyReport.value) {
      payload.remainingCoins = toNonNegInt(remainingCoins.value);
      payload.pagoMovil = toNonNegMoney(pagoMovil.value);
      payload.dolares = toNonNegMoney(dolares.value);
      payload.bolivares = toNonNegMoney(bolivares.value);
      payload.premio = toNonNegMoney(premio.value);
      payload.total = toNonNegMoney(total.value);
    }

    await upsertWeeklyReport(payload);

    window.alert(`Reporte ${reportKindLabel.value} guardado`);
  } catch (e: unknown) {
    window.alert(apiErrorMessage(e));
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadWeeklyReportsList();
  void loadWeeklyCoins();
});

watch(weekEndDate, () => {
  void loadWeeklyCoins();
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
                ? 'border-zinc-700/60 hover:bg-transparent hover:text-white'
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
              <h1 class="text-xl font-semibold sm:text-2xl">
                {{ headerTitle }}
              </h1>
              <span
                class="text-xs font-medium tracking-wide"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                {{ headerSubtitle }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div v-if="showTabs" class="w-full flex justify-center mb-4">
      <div
        class="inline-flex rounded-xl border p-1 text-xs font-semibold"
        :class="
          isDark()
            ? 'border-zinc-800/70 bg-zinc-900/60'
            : 'border-slate-200 bg-white/70'
        "
      >
        <router-link
          :to="{ name: 'reports' }"
          class="px-3 py-1.5 rounded-lg transition"
          :class="
            activeTab === 'sales'
              ? isDark()
                ? 'bg-zinc-800 text-white'
                : 'bg-white text-slate-900 shadow-sm'
              : isDark()
              ? 'text-zinc-400 hover:text-white'
              : 'text-slate-500 hover:text-slate-900'
          "
        >
          Ventas
        </router-link>
        <router-link
          :to="{ name: 'reports-daily' }"
          class="px-3 py-1.5 rounded-lg transition"
          :class="
            activeTab === 'daily'
              ? isDark()
                ? 'bg-zinc-800 text-white'
                : 'bg-white text-slate-900 shadow-sm'
              : isDark()
              ? 'text-zinc-400 hover:text-white'
              : 'text-slate-500 hover:text-slate-900'
          "
        >
          Reportes diarios
        </router-link>
      </div>
    </div>

    <section
      class="rounded-2xl border backdrop-blur-xl p-3 shadow-sm sm:p-6"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-white'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div v-if="canViewReportsList">
        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div class="space-y-1">
            <h2 class="text-lg font-semibold">
              Reportes {{ reportKindPlural }}
            </h2>
            <p
              class="text-sm"
              :class="isDark() ? 'text-zinc-300' : 'text-slate-600'"
            >
              Busca por nombre o usuario del empleado.
            </p>
          </div>

          <label class="grid gap-1 w-full sm:w-80">
            <span
              class="text-xs"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >Buscar</span
            >
            <input
              v-model="query"
              type="text"
              class="h-10 rounded-xl border px-3 text-sm outline-none"
              :class="
                isDark()
                  ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              "
              placeholder="Ej: maria / @maria"
            />
          </label>
        </div>

        <p
          v-if="loadingList"
          class="mt-4 text-sm"
          :class="isDark() ? 'text-zinc-300' : 'text-slate-600'"
        >
          Cargando…
        </p>

        <p
          v-else-if="listError"
          class="mt-4 text-sm"
          :class="isDark() ? 'text-red-300' : 'text-red-600'"
        >
          {{ listError }}
        </p>

        <div v-else class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button
            v-for="r in filteredReports"
            :key="
              String(r.id ?? r.weekEndDate) + '-' + String(r.employeeId ?? '')
            "
            type="button"
            class="rounded-2xl border p-4 text-left transition cursor-pointer"
            :class="
              isDark()
                ? 'border-zinc-800/70 bg-zinc-950/20 hover:bg-zinc-950/30'
                : 'border-slate-200 bg-white/50 hover:bg-white/70'
            "
            @click="openReport(r)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-semibold truncate">
                  {{ r.employeeName || r.employeeUsername || "Empleado" }}
                </p>
                <p
                  class="mt-0.5 text-xs"
                  :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >
                  {{ weekdayEs(r.weekEndDate) }} {{ ddmmyyyy(r.weekEndDate) }}
                </p>
              </div>
              <span
                class="text-xs font-semibold"
                :class="isDark() ? 'text-zinc-200' : 'text-slate-700'"
              >
                Total: {{ toNum(r.total).toFixed(2) }}
              </span>
            </div>

            <div class="mt-3 grid gap-1 text-sm">
              <div class="flex items-center justify-between gap-3">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Boxeo</span
                >
                <span class="font-medium"
                  >Monedas {{ toNum(r.boxeoCoins) }} · Devueltas
                  {{ toNum(r.boxeoReturned) }}</span
                >
              </div>
              <div class="flex items-center justify-between gap-3">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Agilidad</span
                >
                <span class="font-medium"
                  >Monedas {{ toNum(r.agilidadCoins) }} · Perdidas
                  {{ toNum(r.agilidadLost) }}</span
                >
              </div>
            </div>
          </button>

          <p
            v-if="filteredReports.length === 0"
            class="text-sm"
            :class="isDark() ? 'text-zinc-300' : 'text-slate-600'"
          >
            No hay reportes.
          </p>
        </div>
      </div>

      <div
        v-else
        class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div class="space-y-1">
          <h2 class="text-lg font-semibold">
            {{ headerDateLabel || headerDateFallback }}
          </h2>
          <div>
            <p
              class="text-sm font-medium"
              :class="isDark() ? 'text-zinc-300' : 'text-slate-600'"
            >
              Leyenda
            </p>
            <ul
              class="mt-1 text-sm list-disc pl-4 space-y-0.5"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              <li>Monedas: válidas</li>
              <li>Perdidas: por error de máquina o viento</li>
              <li>Devueltas: monedero devolvió</li>
            </ul>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="text-right">
            <div
              class="text-xs"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              Fecha de cierre
            </div>
            <div
              class="text-sm font-medium"
              :class="isDark() ? 'text-zinc-100' : 'text-slate-800'"
            >
              {{ headerDateLabel || "—" }}
            </div>
          </div>

          <div
            class="h-10 inline-flex items-center rounded-xl border px-3 text-sm"
            :class="
              isDark()
                ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            "
          >
            {{ ddmmyyyy(weekEndDate) || "—" }}
          </div>
        </div>
      </div>

      <div v-if="!canViewReportsList" class="mt-6 grid gap-4 sm:grid-cols-2">
        <div
          class="rounded-2xl border p-4"
          :class="
            isDark()
              ? 'border-zinc-800/70 bg-zinc-950/20'
              : 'border-slate-200 bg-white/50'
          "
        >
          <h3 class="text-base font-semibold">Boxeo</h3>
          <div class="mt-3 grid grid-cols-1 gap-3">
            <label class="grid gap-1">
              <span
                class="text-xs"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Monedas:</span
              >
              <input
                v-model.number="boxeoCoins"
                type="number"
                min="0"
                step="1"
                class="h-10 rounded-xl border px-3 text-sm outline-none"
                :class="
                  isDark()
                    ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                "
              />
            </label>

            <label class="grid gap-1">
              <span
                class="text-xs"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Devueltas:</span
              >
              <input
                v-model.number="boxeoReturned"
                type="number"
                min="0"
                step="1"
                class="h-10 rounded-xl border px-3 text-sm outline-none"
                :class="
                  isDark()
                    ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                "
              />
            </label>
          </div>
        </div>

        <div
          class="rounded-2xl border p-4"
          :class="
            isDark()
              ? 'border-zinc-800/70 bg-zinc-950/20'
              : 'border-slate-200 bg-white/50'
          "
        >
          <h3 class="text-base font-semibold">Agilidad</h3>
          <div class="mt-3 grid grid-cols-1 gap-3">
            <label class="grid gap-1">
              <span
                class="text-xs"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Monedas:</span
              >
              <input
                v-model.number="agilidadCoins"
                type="number"
                min="0"
                step="1"
                class="h-10 rounded-xl border px-3 text-sm outline-none"
                :class="
                  isDark()
                    ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                "
              />
            </label>

            <label class="grid gap-1">
              <span
                class="text-xs"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Perdidas:</span
              >
              <input
                v-model.number="agilidadLost"
                type="number"
                min="0"
                step="1"
                class="h-10 rounded-xl border px-3 text-sm outline-none"
                :class="
                  isDark()
                    ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                "
              />
            </label>

            <label class="grid gap-1">
              <span
                class="text-xs"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Devueltas:</span
              >
              <input
                v-model.number="agilidadReturned"
                type="number"
                min="0"
                step="1"
                class="h-10 rounded-xl border px-3 text-sm outline-none"
                :class="
                  isDark()
                    ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                "
              />
            </label>
          </div>
        </div>
      </div>

      <div
        v-if="!canViewReportsList && !isDailyReport"
        class="mt-4 rounded-2xl border p-4"
        :class="
          isDark()
            ? 'border-zinc-800/70 bg-zinc-950/20'
            : 'border-slate-200 bg-white/50'
        "
      >
        <h3 class="text-base font-semibold">Totales</h3>

        <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label class="grid gap-1">
            <span
              class="text-xs"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >Monedas: restantes:</span
            >
            <input
              v-model.number="remainingCoins"
              type="number"
              min="0"
              step="1"
              class="h-10 rounded-xl border px-3 text-sm outline-none"
              :class="
                isDark()
                  ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              "
            />
          </label>

          <label class="grid gap-1">
            <span
              class="text-xs"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >Pago movil:</span
            >
            <input
              v-model.number="pagoMovil"
              type="number"
              min="0"
              step="0.01"
              class="h-10 rounded-xl border px-3 text-sm outline-none"
              :class="
                isDark()
                  ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              "
            />
          </label>

          <label class="grid gap-1">
            <span
              class="text-xs"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >Dolares:</span
            >
            <input
              v-model.number="dolares"
              type="number"
              min="0"
              step="0.01"
              class="h-10 rounded-xl border px-3 text-sm outline-none"
              :class="
                isDark()
                  ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              "
            />
          </label>

          <label class="grid gap-1">
            <span
              class="text-xs"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >Bolívares:</span
            >
            <input
              v-model.number="bolivares"
              type="number"
              min="0"
              step="0.01"
              class="h-10 rounded-xl border px-3 text-sm outline-none"
              :class="
                isDark()
                  ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              "
            />
          </label>

          <label class="grid gap-1">
            <span
              class="text-xs"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >Premio:</span
            >
            <input
              v-model.number="premio"
              type="number"
              min="0"
              step="0.01"
              class="h-10 rounded-xl border px-3 text-sm outline-none"
              :class="
                isDark()
                  ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              "
            />
          </label>

          <label class="grid gap-1">
            <span
              class="text-xs"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >total:</span
            >
            <input
              v-model.number="total"
              type="number"
              min="0"
              step="0.01"
              class="h-10 rounded-xl border px-3 text-sm outline-none"
              :class="
                isDark()
                  ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              "
            />
          </label>
        </div>
      </div>

      <div v-if="!canViewReportsList" class="mt-5 flex justify-end">
        <button
          type="button"
          class="inline-flex h-11 items-center justify-center rounded-xl border px-5 text-sm font-medium transition cursor-pointer"
          :disabled="saving"
          :class="
            saving
              ? isDark()
                ? 'border-zinc-700/60 bg-zinc-950/30 text-zinc-400'
                : 'border-slate-200 bg-slate-50 text-slate-400'
              : isDark()
              ? 'border-zinc-700/60 bg-zinc-950/20 text-white hover:bg-zinc-950/30'
              : 'border-sky-300/80 bg-sky-50/70 text-sky-700 hover:bg-sky-50/90'
          "
          @click="saveWeekly"
        >
          {{ saving ? "Guardando…" : saveButtonLabel }}
        </button>
      </div>
    </section>

    <div class="h-10" />
  </div>
</template>
