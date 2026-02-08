<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTheme } from "@/composables/useTheme";
import { getWeeklyReports } from "@/api/client";
import { useCurrentUser } from "@/composables/useCurrentUser";

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

const route = useRoute();
const router = useRouter();

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;

const sidebarOpen = ref(false);
const loading = ref(false);
const error = ref<string>("");
const report = ref<WeeklyReportRow | null>(null);

const { isAdmin, isSupervisor } = useCurrentUser();
const canViewReports = computed(() => isAdmin.value || isSupervisor.value);

const reportId = computed(() => String(route.params.reportId || "").trim());

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

function goBack() {
  router.push({ name: "reports" });
}

async function loadReport() {
  if (!canViewReports.value) {
    router.replace({ name: "reports" });
    return;
  }

  loading.value = true;
  error.value = "";
  try {
    const rows: unknown = await getWeeklyReports();
    const normalized = (Array.isArray(rows) ? rows : []).map((r) =>
      normalizeReport(r)
    );

    let found: WeeklyReportRow | undefined;
    if (reportId.value) {
      const idNum = Number(reportId.value);
      if (Number.isFinite(idNum)) {
        found = normalized.find((r) => Number(r.id) === idNum);
      }
    }

    if (!found) {
      const queryWeek = String(route.query.weekEndDate || "");
      const queryEmployeeId = String(route.query.employeeId || "");
      const queryUsername = String(route.query.employeeUsername || "");
      found = normalized.find((r) => {
        if (queryWeek && r.weekEndDate !== queryWeek) return false;
        if (queryEmployeeId && String(r.employeeId || "") !== queryEmployeeId) {
          return false;
        }
        if (
          queryUsername &&
          String(r.employeeUsername || "") !== queryUsername
        ) {
          return false;
        }
        return true;
      });
    }

    report.value = found || null;
    if (!report.value) {
      error.value = "No se encontro el reporte solicitado.";
    }
  } catch (e) {
    error.value = "No se pudo cargar el reporte.";
    report.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadReport();
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
            aria-label="Abrir menu lateral"
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
                Detalle de reporte
              </h1>
              <span
                class="text-xs font-medium tracking-wide"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                Reporte semanal
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium cursor-pointer"
          :class="
            isDark()
              ? 'border-zinc-700/60 text-zinc-200 hover:bg-zinc-100/10'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          "
          @click="goBack"
        >
          <span>←</span>
          <span>Volver</span>
        </button>
      </div>
    </header>

    <section
      class="rounded-2xl border backdrop-blur-xl p-4 shadow-sm sm:p-6"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-white'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <p
        v-if="loading"
        class="text-sm"
        :class="isDark() ? 'text-zinc-300' : 'text-slate-600'"
      >
        Cargando...
      </p>

      <p
        v-else-if="error"
        class="text-sm"
        :class="isDark() ? 'text-red-300' : 'text-red-600'"
      >
        {{ error }}
      </p>

      <div v-else-if="report" class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-base font-semibold truncate">
              {{ report.employeeName || report.employeeUsername || "Empleado" }}
            </p>
            <p
              class="mt-0.5 text-sm"
              :class="isDark() ? 'text-zinc-300' : 'text-slate-600'"
            >
              {{ weekdayEs(report.weekEndDate) }}
              {{ ddmmyyyy(report.weekEndDate) }}
            </p>
            <div class="mt-2">
              <p
                class="text-xs font-medium"
                :class="isDark() ? 'text-zinc-300' : 'text-slate-600'"
              >
                Leyenda
              </p>
              <ul
                class="mt-1 text-xs list-disc pl-4 space-y-0.5"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                <li>Monedas: validas</li>
                <li>Perdidas: por error de maquina o viento</li>
                <li>Devueltas: monedero devolvio</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div
            class="rounded-2xl border p-4"
            :class="
              isDark()
                ? 'border-zinc-800/70 bg-zinc-950/20'
                : 'border-slate-200 bg-white/50'
            "
          >
            <h3 class="text-sm font-semibold">Boxeo</h3>
            <div class="mt-2 grid gap-1 text-sm">
              <div class="flex items-center justify-between">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Monedas</span
                >
                <span class="font-semibold">{{
                  toNum(report.boxeoCoins)
                }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Devueltas</span
                >
                <span class="font-semibold">{{
                  toNum(report.boxeoReturned)
                }}</span>
              </div>
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
            <h3 class="text-sm font-semibold">Agilidad</h3>
            <div class="mt-2 grid gap-1 text-sm">
              <div class="flex items-center justify-between">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Monedas</span
                >
                <span class="font-semibold">{{
                  toNum(report.agilidadCoins)
                }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >Perdidas</span
                >
                <span class="font-semibold">{{
                  toNum(report.agilidadLost)
                }}</span>
              </div>
            </div>
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
          <h3 class="text-sm font-semibold">Totales</h3>
          <div class="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            <div class="flex items-center justify-between gap-3">
              <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Monedas restantes</span
              >
              <span class="font-semibold">{{
                toNum(report.remainingCoins)
              }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Pago movil</span
              >
              <span class="font-semibold">{{
                toNum(report.pagoMovil).toFixed(2)
              }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Dolares</span
              >
              <span class="font-semibold">{{
                toNum(report.dolares).toFixed(2)
              }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Bolivares</span
              >
              <span class="font-semibold">{{
                toNum(report.bolivares).toFixed(2)
              }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Premio</span
              >
              <span class="font-semibold">{{
                toNum(report.premio).toFixed(2)
              }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >Total</span
              >
              <span class="font-semibold">{{
                toNum(report.total).toFixed(2)
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
