<script setup lang="ts">
/* global defineProps */
import AppSidebar from "@/components/AppSidebar.vue";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useTheme } from "@/composables/useTheme";
import { getTodayLocalStr } from "@/utils/date";
import {
  getDailySaleEntries,
  getDailySales,
  getMachines,
  getUsers,
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
  createdAt?: string;
  updatedAt?: string;
};

type Props = {
  canViewReportsList: boolean;
  roleKind: string;
  assignedMachineIds: string[];
  showOwnHistory?: boolean;
  title?: string;
  subtitle?: string;
  reportKindLabel?: string;
  reportKindPlural?: string;
  initialSection?: "reports" | "history";
};

const props = defineProps<Props>();

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;

const sidebarOpen = ref(false);
const saving = ref(false);
const showLeyendaModal = ref(false);
const showSearch = ref(false);

const canViewReportsList = computed(() => props.canViewReportsList);
const canShowHistory = computed(
  () => canViewReportsList.value || Boolean(props.showOwnHistory)
);
const operatorSection = ref<"reports" | "history">(
  props.initialSection || "reports"
);
const showingHistorySection = computed(
  () =>
    canShowHistory.value &&
    (canViewReportsList.value || operatorSection.value === "history")
);
const showingReportSection = computed(
  () =>
    !canViewReportsList.value &&
    (!canShowHistory.value || operatorSection.value === "reports")
);
const isAdmin = computed(() => props.roleKind === "admin");
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
const saveButtonLabel = computed(
  () => `Guardar reporte ${reportKindLabel.value}`
);
const isDailyReport = computed(() => reportKindLabel.value === "diario");
const reports = ref<WeeklyReportRow[]>([]);
const selectedHistoryReport = ref<WeeklyReportRow | null>(null);
const loadingList = ref(false);
const listError = ref<string>("");
const query = ref<string>("");
const router = useRouter();

const todayYmd = (date?: Date) => {
  if (!date) return getTodayLocalStr();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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
const pagoMovil = ref<string>("");
const dolares = ref<string>("");
const bolivares = ref<string>("");
const premio = ref<string>("");
const total = ref<string>("");
const loadingCoins = ref(false);
let refreshTimer: number | null = null;

function handleWindowFocus() {
  if (!canViewReportsList.value && isDailyReport.value) {
    void loadWeeklyCoins();
  }
}

function startAutoRefresh() {
  if (canViewReportsList.value || !isDailyReport.value) return;
  if (refreshTimer) return;
  refreshTimer = window.setInterval(() => {
    void loadWeeklyCoins();
  }, 8000);
  window.addEventListener("focus", handleWindowFocus);
}

function stopAutoRefresh() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }
  window.removeEventListener("focus", handleWindowFocus);
}

type DailySaleRow = {
  machineType?: string | null;
  machine_type?: string | null;
  coins?: number | null;
  returned?: number | null;
  lost?: number | null;
};

type DailySaleEntryRow = {
  machineType?: string | null;
  machine_type?: string | null;
  coins?: number | null;
  returned?: number | null;
  lost?: number | null;
  createdAt?: string | null;
  created_at?: string | null;
};

type MachineRow = {
  id?: string | number;
  name?: string | null;
  type?: string | null;
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

function parseLooseMoney(value: string | number | null): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value > 0 ? value : 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const sanitized = trimmed.replace(/[^0-9.,-]/g, "");
  const negative = sanitized.includes("-");
  const cleaned = sanitized.replace(/-/g, "");
  let lastComma = cleaned.lastIndexOf(",");
  let lastDot = cleaned.lastIndexOf(".");

  if (lastDot > -1 && lastComma === -1) {
    const parts = cleaned.split(".");
    if (parts.length > 1 && parts.slice(1).every((p) => p.length === 3)) {
      lastDot = -1;
    }
  }

  if (lastComma > -1 && lastDot === -1) {
    const parts = cleaned.split(",");
    if (parts.length > 1 && parts.slice(1).every((p) => p.length === 3)) {
      lastComma = -1;
    }
  }

  const decimalIndex = Math.max(lastComma, lastDot);

  let numStr = "";
  if (decimalIndex === -1) {
    numStr = cleaned.replace(/[.,]/g, "");
  } else {
    const intPart = cleaned.slice(0, decimalIndex).replace(/[.,]/g, "");
    const fracPart = cleaned.slice(decimalIndex + 1).replace(/[.,]/g, "");
    numStr = `${intPart || "0"}.${fracPart}`;
  }

  const n = Number(numStr);
  if (!Number.isFinite(n)) return 0;
  return negative ? 0 : n;
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

function isSupervisorJobRole(jobRole: unknown): boolean {
  if (typeof jobRole !== "string") return false;
  return jobRole.trim().toLowerCase().includes("supervisor");
}

type UserRow = {
  id?: number;
  jobRole?: string;
  job_role?: string;
};

function getSupervisorIds(rows: unknown[]): Set<number> {
  const ids = new Set<number>();
  for (const row of rows) {
    const rec = asRecord(row) as UserRow | null;
    if (!rec) continue;
    const id = Number(rec.id);
    if (!Number.isFinite(id)) continue;
    const jobRole = rec.jobRole ?? rec.job_role ?? "";
    if (isSupervisorJobRole(jobRole)) ids.add(id);
  }
  return ids;
}

function normalizeReport(row: unknown): WeeklyReportRow {
  const rec = asRecord(row) ?? {};
  const idValue = Number(rec.id);

  const weekEndDate = String(pick(rec, ["weekEndDate", "week_end_date"]) ?? "");
  const employeeUsername = pick(rec, ["employeeUsername", "employee_username"]);
  const employeeName = pick(rec, ["employeeName", "employee_name"]);
  const employeeIdValue = pick(rec, ["employeeId", "employee_id"]);
  const updatedAt = pick(rec, ["updatedAt", "updated_at"]);
  const createdAt = pick(rec, ["createdAt", "created_at"]);

  return {
    id: Number.isFinite(idValue) ? idValue : undefined,
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
    createdAt: typeof createdAt === "string" ? createdAt : undefined,
    updatedAt: typeof updatedAt === "string" ? updatedAt : undefined,
  };
}

function toDateMs(value?: string | null): number | null {
  if (!value) return null;
  const dt = new Date(value);
  const ms = dt.getTime();
  return Number.isNaN(ms) ? null : ms;
}

async function loadWeeklyReportsList() {
  if (!canShowHistory.value) return;
  loadingList.value = true;
  listError.value = "";
  try {
    const [rows, users] = await Promise.all([
      getWeeklyReports(
        isDailyReport.value ? { reportKind: "diario" } : undefined
      ),
      isAdmin.value ? getUsers() : Promise.resolve([]),
    ]);
    const supervisorIds = getSupervisorIds(users as unknown[]);
    reports.value = (Array.isArray(rows) ? rows : [])
      .map((r) => normalizeReport(r))
      .filter((r) =>
        isAdmin.value ? !supervisorIds.has(Number(r.employeeId ?? 0)) : true
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
  if (!canViewReportsList.value) {
    selectedHistoryReport.value = row;
    return;
  }

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

function getMachineTypeLabel(machine: MachineRow): string {
  const raw = machine.type ?? machine.name ?? "";
  return String(raw).toLowerCase();
}

const assignedMachines = ref<MachineRow[]>([]);
const showAgilidad = computed(() => {
  if (canViewReportsList.value) return true;
  if (!assignedMachines.value.length) return false;
  return assignedMachines.value.some((m) =>
    getMachineTypeLabel(m).includes("agilidad")
  );
});

async function loadAssignedMachines() {
  if (canViewReportsList.value) return;
  const ids = new Set((props.assignedMachineIds || []).map(String));
  if (ids.size === 0) {
    assignedMachines.value = [];
    return;
  }

  try {
    const rows = (await getMachines()) as MachineRow[];
    assignedMachines.value = (Array.isArray(rows) ? rows : []).filter((m) =>
      ids.has(String(m.id))
    );
  } catch {
    assignedMachines.value = [];
  }
}

async function loadWeeklyCoins() {
  if (canViewReportsList.value) return;
  if (!weekEndDate.value) return;

  if (isDailyReport.value) {
    loadingCoins.value = true;
    try {
      const [entries, reports] = await Promise.all([
        getDailySaleEntries({
          startDate: weekEndDate.value,
          endDate: weekEndDate.value,
        }),
        getWeeklyReports({
          reportKind: "diario",
          startDate: weekEndDate.value,
          endDate: weekEndDate.value,
        }),
      ]);

      const normalizedReports = (Array.isArray(reports) ? reports : []).map(
        (r) => normalizeReport(r)
      );
      const lastReportAt = normalizedReports.reduce((latest, r) => {
        const ms = toDateMs(r.createdAt);
        return ms && ms > latest ? ms : latest;
      }, 0);

      const filteredEntries = (Array.isArray(entries) ? entries : []).filter(
        (row) => {
          const rec = row as DailySaleEntryRow;
          if (!lastReportAt) return true;
          const entryMs = toDateMs(rec.createdAt ?? rec.created_at ?? null);
          if (!entryMs) return true;
          return entryMs > lastReportAt;
        }
      ) as DailySaleEntryRow[];

      let boxeo = 0;
      let agilidad = 0;
      let boxeoDevueltas = 0;
      let agilidadPerdidas = 0;
      let agilidadDevueltas = 0;

      for (const row of filteredEntries) {
        const coins = Number(row.coins ?? 0);
        if (!Number.isFinite(coins)) continue;
        const type = getMachineType(row as DailySaleRow);
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
    } catch {
      boxeoCoins.value = 0;
      agilidadCoins.value = 0;
      boxeoReturned.value = 0;
      agilidadLost.value = 0;
      agilidadReturned.value = 0;
    } finally {
      loadingCoins.value = false;
    }
    return;
  }

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

const reportsTitle = computed(() =>
  canViewReportsList.value
    ? `Reportes ${reportKindPlural.value}`
    : `Mis reportes ${reportKindPlural.value}`
);

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

type GroupedReport = {
  monthLabel: string;
  reports: WeeklyReportRow[];
};

const groupedReports = computed<GroupedReport[]>(() => {
  const groups: Record<string, WeeklyReportRow[]> = {};
  const monthOrder: string[] = [];

  for (const r of filteredReports.value) {
    const dt = parseReportDate(r.weekEndDate);
    if (!dt) continue;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
      2,
      "0"
    )}`;

    if (!groups[key]) {
      groups[key] = [];
      monthOrder.push(key);
    }
    groups[key].push(r);
  }

  return monthOrder.map((key) => ({
    monthLabel:
      (groups[key][0] &&
        (() => {
          const dt = parseReportDate(groups[key][0].weekEndDate);
          if (!dt) return key;
          const label = new Intl.DateTimeFormat("es-VE", {
            month: "long",
            year: "numeric",
          }).format(dt);
          return label.charAt(0).toUpperCase() + label.slice(1);
        })()) ||
      key,
    reports: groups[key],
  }));
});

function shortDateLabel(ymd: string): string {
  const dt = parseReportDate(ymd);
  if (!dt) return ymd;
  return new Intl.DateTimeFormat("es-VE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(dt);
}

function toNonNegInt(value: number | null): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.trunc(n);
}

function toNonNegMoney(value: string | number | null): number {
  const n = parseLooseMoney(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
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
      agilidadCoins: showAgilidad.value ? toNonNegInt(agilidadCoins.value) : 0,
      agilidadLost: showAgilidad.value ? toNonNegInt(agilidadLost.value) : 0,
      agilidadReturned: showAgilidad.value
        ? toNonNegInt(agilidadReturned.value)
        : 0,
      remainingCoins: 0,
      pagoMovil: 0,
      dolares: 0,
      bolivares: 0,
      premio: 0,
      total: 0,
    };

    if (!isDailyReport.value) {
      payload.remainingCoins = toNonNegInt(remainingCoins.value);
    }

    payload.pagoMovil = toNonNegMoney(pagoMovil.value);
    payload.dolares = toNonNegMoney(dolares.value);
    payload.bolivares = toNonNegMoney(bolivares.value);
    payload.premio = toNonNegMoney(premio.value);
    payload.total = toNonNegMoney(total.value);

    await upsertWeeklyReport({
      ...payload,
      reportKind: isDailyReport.value ? "diario" : undefined,
    });

    window.alert(`Reporte ${reportKindLabel.value} guardado`);

    if (isDailyReport.value) {
      boxeoCoins.value = 0;
      boxeoLost.value = 0;
      boxeoReturned.value = 0;
      agilidadCoins.value = 0;
      agilidadLost.value = 0;
      agilidadReturned.value = 0;
      pagoMovil.value = "";
      dolares.value = "";
      bolivares.value = "";
      premio.value = "";
      total.value = "";
    }
  } catch (e: unknown) {
    window.alert(apiErrorMessage(e));
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadWeeklyReportsList();
  void loadWeeklyCoins();
  void loadAssignedMachines();
  startAutoRefresh();
});

onUnmounted(() => {
  stopAutoRefresh();
});

watch(weekEndDate, () => {
  void loadWeeklyCoins();
});

watch(
  () => props.assignedMachineIds,
  () => {
    void loadAssignedMachines();
  },
  { deep: true }
);

watch(operatorSection, (section) => {
  if (section !== "history") {
    selectedHistoryReport.value = null;
  }
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
              {{ headerTitle }}
            </h1>
            <p
              class="text-xs truncate"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              {{ headerSubtitle }}
            </p>
          </div>
        </div>
      </div>
    </header>

    <section
      class="rounded-2xl border backdrop-blur-xl p-3 shadow-sm sm:p-6"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-white'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div
        v-if="canShowHistory && !canViewReportsList && !props.initialSection"
        class="mb-4 inline-flex rounded-xl border p-1 text-xs font-semibold"
        :class="
          isDark()
            ? 'border-zinc-800/70 bg-zinc-900/60'
            : 'border-slate-200 bg-white/70'
        "
      >
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg transition cursor-pointer"
          :class="
            operatorSection === 'reports'
              ? isDark()
                ? 'bg-zinc-800 text-white'
                : 'bg-white text-slate-900 shadow-sm'
              : isDark()
              ? 'text-zinc-400 hover:text-white'
              : 'text-slate-500 hover:text-slate-900'
          "
          @click="operatorSection = 'reports'"
        >
          Reportes
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg transition cursor-pointer"
          :class="
            operatorSection === 'history'
              ? isDark()
                ? 'bg-zinc-800 text-white'
                : 'bg-white text-slate-900 shadow-sm'
              : isDark()
              ? 'text-zinc-400 hover:text-white'
              : 'text-slate-500 hover:text-slate-900'
          "
          @click="operatorSection = 'history'"
        >
          Historial reportes
        </button>
      </div>

      <div v-if="showingHistorySection">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold">{{ reportsTitle }}</h2>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-xl transition cursor-pointer"
              :class="
                showSearch
                  ? isDark()
                    ? 'bg-zinc-800 text-white'
                    : 'bg-slate-100 text-slate-900'
                  : isDark()
                  ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              "
              aria-label="Buscar"
              @click="showSearch = !showSearch"
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <transition name="slide-down">
          <div v-if="showSearch" class="mt-3">
            <input
              v-model="query"
              type="text"
              class="h-10 w-full rounded-xl border px-3 text-sm outline-none"
              :class="
                isDark()
                  ? 'bg-zinc-950/30 border-zinc-700/60 text-white placeholder-zinc-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
              "
              :placeholder="
                canViewReportsList ? 'Ej: maria / @maria' : 'Busca por fecha'
              "
            />
          </div>
        </transition>

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

        <div v-else class="mt-4 space-y-6">
          <template v-for="group in groupedReports" :key="group.monthLabel">
            <div
              class="sticky top-0 z-10 -mx-3 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider"
              :class="
                isDark()
                  ? 'bg-zinc-950/90 text-zinc-400 backdrop-blur-sm'
                  : 'bg-slate-100/90 text-slate-500 backdrop-blur-sm'
              "
            >
              {{ group.monthLabel }}
            </div>

            <div class="space-y-2">
              <button
                v-for="r in group.reports"
                :key="
                  String(r.id ?? r.weekEndDate) +
                  '-' +
                  String(r.employeeId ?? '')
                "
                type="button"
                class="w-full rounded-xl border p-3 text-left transition cursor-pointer"
                :class="
                  !canViewReportsList && selectedHistoryReport?.id === r.id
                    ? isDark()
                      ? 'border-zinc-600/80 bg-zinc-900/40'
                      : 'border-slate-400 bg-white/80'
                    : isDark()
                    ? 'border-zinc-800/70 bg-zinc-950/20 hover:bg-zinc-950/30'
                    : 'border-slate-200 bg-white/50 hover:bg-white/70'
                "
                @click="openReport(r)"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <p
                      v-if="canViewReportsList"
                      class="text-sm font-medium truncate"
                    >
                      {{ r.employeeName || r.employeeUsername || "Empleado" }}
                    </p>
                    <p
                      class="text-sm font-semibold"
                      :class="
                        canViewReportsList
                          ? isDark()
                            ? 'text-zinc-300'
                            : 'text-slate-700'
                          : ''
                      "
                    >
                      {{ shortDateLabel(r.weekEndDate) }}
                    </p>
                  </div>
                  <span
                    class="text-sm font-bold shrink-0"
                    :class="isDark() ? 'text-emerald-400' : 'text-emerald-600'"
                  >
                    {{ toNum(r.total).toFixed(2) }}
                  </span>
                </div>

                <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'">
                    Boxeo
                    <span
                      class="font-medium"
                      :class="isDark() ? 'text-zinc-200' : 'text-slate-700'"
                    >
                      {{ toNum(r.boxeoCoins) }}
                    </span>
                    /
                    <span
                      class="font-medium"
                      :class="isDark() ? 'text-zinc-200' : 'text-slate-700'"
                    >
                      {{ toNum(r.boxeoReturned) }}
                    </span>
                  </span>
                  <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'">
                    Agilidad
                    <span
                      class="font-medium"
                      :class="isDark() ? 'text-zinc-200' : 'text-slate-700'"
                    >
                      {{ toNum(r.agilidadCoins) }}
                    </span>
                    /
                    <span
                      class="font-medium"
                      :class="isDark() ? 'text-zinc-200' : 'text-slate-700'"
                    >
                      {{ toNum(r.agilidadLost) }}
                    </span>
                  </span>
                </div>
              </button>
            </div>
          </template>

          <p
            v-if="filteredReports.length === 0"
            class="text-sm"
            :class="isDark() ? 'text-zinc-300' : 'text-slate-600'"
          >
            No hay reportes.
          </p>
        </div>

        <div
          v-if="!canViewReportsList && selectedHistoryReport"
          class="mt-5 rounded-2xl border p-4"
          :class="
            isDark()
              ? 'border-zinc-700/70 bg-zinc-950/20'
              : 'border-slate-200 bg-white/60'
          "
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-semibold">Reporte completo</h3>
              <p
                class="text-xs mt-1"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                {{ weekdayEs(selectedHistoryReport.weekEndDate) }}
                {{ ddmmyyyy(selectedHistoryReport.weekEndDate) }}
              </p>
            </div>
            <span
              class="text-xs font-semibold"
              :class="isDark() ? 'text-zinc-200' : 'text-slate-700'"
            >
              Total: {{ toNum(selectedHistoryReport.total).toFixed(2) }}
            </span>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <div
              class="rounded-xl border p-3"
              :class="
                isDark()
                  ? 'border-zinc-800/70 bg-zinc-900/40'
                  : 'border-slate-200 bg-white/70'
              "
            >
              <p class="text-sm font-semibold">Boxeo</p>
              <div class="mt-2 grid gap-1 text-sm">
                <div class="flex items-center justify-between">
                  <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                    >Monedas</span
                  >
                  <span class="font-semibold">{{
                    toNum(selectedHistoryReport.boxeoCoins)
                  }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                    >Perdidas</span
                  >
                  <span class="font-semibold">{{
                    toNum(selectedHistoryReport.boxeoLost)
                  }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                    >Devueltas</span
                  >
                  <span class="font-semibold">{{
                    toNum(selectedHistoryReport.boxeoReturned)
                  }}</span>
                </div>
              </div>
            </div>

            <div
              class="rounded-xl border p-3"
              :class="
                isDark()
                  ? 'border-zinc-800/70 bg-zinc-900/40'
                  : 'border-slate-200 bg-white/70'
              "
            >
              <p class="text-sm font-semibold">Agilidad</p>
              <div class="mt-2 grid gap-1 text-sm">
                <div class="flex items-center justify-between">
                  <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                    >Monedas</span
                  >
                  <span class="font-semibold">{{
                    toNum(selectedHistoryReport.agilidadCoins)
                  }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                    >Perdidas</span
                  >
                  <span class="font-semibold">{{
                    toNum(selectedHistoryReport.agilidadLost)
                  }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                    >Devueltas</span
                  >
                  <span class="font-semibold">{{
                    toNum(selectedHistoryReport.agilidadReturned)
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <div
            class="mt-3 rounded-xl border p-3"
            :class="
              isDark()
                ? 'border-zinc-800/70 bg-zinc-900/40'
                : 'border-slate-200 bg-white/70'
            "
          >
            <p class="text-sm font-semibold">Totales</p>
            <div class="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              <div class="flex items-center justify-between">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Pago movil</span
                >
                <span class="font-semibold">{{
                  toNum(selectedHistoryReport.pagoMovil).toFixed(2)
                }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Dolares</span
                >
                <span class="font-semibold">{{
                  toNum(selectedHistoryReport.dolares).toFixed(2)
                }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Bolivares</span
                >
                <span class="font-semibold">{{
                  toNum(selectedHistoryReport.bolivares).toFixed(2)
                }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Premio</span
                >
                <span class="font-semibold">{{
                  toNum(selectedHistoryReport.premio).toFixed(2)
                }}</span>
              </div>
              <div
                v-if="!isDailyReport"
                class="flex items-center justify-between"
              >
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Monedas restantes</span
                >
                <span class="font-semibold">{{
                  toNum(selectedHistoryReport.remainingCoins)
                }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Total</span
                >
                <span class="font-semibold">{{
                  toNum(selectedHistoryReport.total).toFixed(2)
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else
        class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-semibold">Cierre diario</h2>
          <button
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-full transition cursor-pointer"
            :class="
              isDark()
                ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            "
            aria-label="Ver leyenda"
            @click="showLeyendaModal = true"
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <input
          v-model="weekEndDate"
          type="date"
          class="h-10 rounded-xl border px-3 text-sm outline-none w-full sm:w-auto"
          :class="
            isDark()
              ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
              : 'bg-white border-slate-200 text-slate-900'
          "
        />
      </div>

      <!-- Leyenda modal -->
      <transition name="fade">
        <div
          v-if="showLeyendaModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          @click="showLeyendaModal = false"
        >
          <div
            class="w-full max-w-sm rounded-2xl border p-5 shadow-xl"
            :class="
              isDark()
                ? 'border-zinc-700/70 bg-zinc-900 text-white'
                : 'border-slate-200 bg-white text-slate-900'
            "
            @click.stop
          >
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-base font-semibold">Leyenda</h3>
              <button
                type="button"
                class="inline-flex h-7 w-7 items-center justify-center rounded-lg transition cursor-pointer"
                :class="
                  isDark()
                    ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                "
                @click="showLeyendaModal = false"
              >
                <svg
                  class="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            </div>
            <ul
              class="text-sm space-y-2"
              :class="isDark() ? 'text-zinc-300' : 'text-slate-600'"
            >
              <li class="flex items-start gap-2">
                <span class="font-medium shrink-0">Monedas:</span>
                <span>válidas</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-medium shrink-0">Perdidas:</span>
                <span>por error de máquina o viento</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-medium shrink-0">Devueltas:</span>
                <span>monedero devolvió</span>
              </li>
            </ul>
          </div>
        </div>
      </transition>

      <div v-if="showingReportSection" class="mt-6 space-y-6">
        <!-- Boxeo -->
        <div>
          <h3
            class="text-base font-semibold pb-2 border-b"
            :class="isDark() ? 'border-zinc-800' : 'border-slate-200'"
          >
            Boxeo
          </h3>
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
                readonly
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
                readonly
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

        <!-- Agilidad -->
        <div v-if="showAgilidad">
          <h3
            class="text-base font-semibold pb-2 border-b"
            :class="isDark() ? 'border-zinc-800' : 'border-slate-200'"
          >
            Agilidad
          </h3>
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
                readonly
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
                readonly
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
                readonly
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

        <!-- Totales diario -->
        <div v-if="isDailyReport">
          <h3
            class="text-base font-semibold pb-2 border-b"
            :class="isDark() ? 'border-zinc-800' : 'border-slate-200'"
          >
            Totales
          </h3>

          <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label class="grid gap-1">
              <span
                class="text-xs"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Pago movil:</span
              >
              <input
                v-model="pagoMovil"
                type="text"
                inputmode="decimal"
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
                v-model="dolares"
                type="text"
                inputmode="decimal"
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
                >Bolívares efectivo:</span
              >
              <input
                v-model="bolivares"
                type="text"
                inputmode="decimal"
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
                v-model="premio"
                type="text"
                inputmode="decimal"
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
                >Total:</span
              >
              <input
                v-model="total"
                type="text"
                inputmode="decimal"
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

        <!-- Totales semanal -->
        <div v-if="!isDailyReport">
          <h3
            class="text-base font-semibold pb-2 border-b"
            :class="isDark() ? 'border-zinc-800' : 'border-slate-200'"
          >
            Totales
          </h3>

          <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label class="grid gap-1">
              <span
                class="text-xs"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Monedas restantes:</span
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
                v-model="pagoMovil"
                type="text"
                inputmode="decimal"
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
                v-model="dolares"
                type="text"
                inputmode="decimal"
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
                v-model="bolivares"
                type="text"
                inputmode="decimal"
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
                v-model="premio"
                type="text"
                inputmode="decimal"
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
                >Total:</span
              >
              <input
                v-model="total"
                type="text"
                inputmode="decimal"
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

      <div v-if="showingReportSection" class="mt-5 flex justify-end">
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

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: max-height 0.2s ease, opacity 0.2s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}
.slide-down-enter-to,
.slide-down-leave-from {
  max-height: 3rem;
  opacity: 1;
}
</style>
