<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTheme } from "@/composables/useTheme";
import { getWeeklyReports } from "@/api/client";

type WeeklyReportRow = {
  id?: number;
  employeeId?: number;
  employeeName?: string;
  employeeUsername?: string;
  weekEndDate: string;
  createdAt?: string;
  boxeoCoins: number;
  boxeoReturned: number;
  agilidadCoins: number;
  agilidadLost: number;
  total: number;
};

const route = useRoute();
const router = useRouter();

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;

const sidebarOpen = ref(false);
const loading = ref(false);
const error = ref("");
const rows = ref<WeeklyReportRow[]>([]);

const employeeId = computed(() => {
  const raw = route.params.employeeId ?? route.query.employeeId;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
});

const headerName = computed(() => {
  const qName = String(route.query.employeeName || "").trim();
  const qUser = String(route.query.employeeUsername || "").trim();
  const rowName =
    rows.value[0]?.employeeName || rows.value[0]?.employeeUsername;
  return qName || qUser || rowName || "Empleado";
});

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

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeReport(row: unknown): WeeklyReportRow | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const idValue = Number(rec.id);
  return {
    id: Number.isFinite(idValue) ? idValue : undefined,
    employeeId: toNum(pick(rec, ["employeeId", "employee_id"])) || undefined,
    employeeName: String(pick(rec, ["employeeName", "employee_name"]) || ""),
    employeeUsername: String(
      pick(rec, ["employeeUsername", "employee_username"]) || ""
    ),
    weekEndDate: String(pick(rec, ["weekEndDate", "week_end_date"]) || ""),
    createdAt:
      String(pick(rec, ["createdAt", "created_at"]) || "") || undefined,
    boxeoCoins: toNum(pick(rec, ["boxeoCoins", "boxeo_coins"])),
    boxeoReturned: toNum(pick(rec, ["boxeoReturned", "boxeo_returned"])),
    agilidadCoins: toNum(pick(rec, ["agilidadCoins", "agilidad_coins"])),
    agilidadLost: toNum(pick(rec, ["agilidadLost", "agilidad_lost"])),
    total: toNum(pick(rec, ["total"])),
  };
}

function apiErrorMessage(e: unknown): string {
  const msg = (e as { response?: { data?: { message?: string } } })?.response
    ?.data?.message;
  return msg || "Ocurrio un error";
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

function ddmmyyyy(dateYmd: string): string {
  const dt = parseReportDate(dateYmd);
  if (!dt) return "";
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dt);
}

function weekdayEs(dateYmd: string): string {
  const dt = parseReportDate(dateYmd);
  if (!dt) return "";
  const raw = new Intl.DateTimeFormat("es-VE", { weekday: "long" }).format(dt);
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : raw;
}

function goBack() {
  router.push({ name: "reports-daily" });
}

function openReport(row: WeeklyReportRow) {
  if (typeof row.id === "number") {
    router.push({
      name: "report-detail",
      params: { reportId: row.id },
      query: { reportKind: "diario" },
    });
    return;
  }

  router.push({
    name: "report-detail",
    query: {
      reportKind: "diario",
      weekEndDate: row.weekEndDate,
      employeeId: row.employeeId ? String(row.employeeId) : "",
      employeeUsername: row.employeeUsername || "",
    },
  });
}

async function loadReports() {
  if (!employeeId.value) {
    error.value = "Empleado no valido.";
    return;
  }

  loading.value = true;
  error.value = "";
  try {
    const data = await getWeeklyReports({
      employeeId: employeeId.value,
      reportKind: "diario",
    });
    rows.value = (Array.isArray(data) ? data : [])
      .map((row) => normalizeReport(row))
      .filter(Boolean)
      .sort((a, b) => {
        const aKey = a.createdAt || a.weekEndDate;
        const bKey = b.createdAt || b.weekEndDate;
        return String(bKey).localeCompare(String(aKey));
      }) as WeeklyReportRow[];
  } catch (e) {
    error.value = apiErrorMessage(e);
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadReports();
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
      'min-h-screen px-3 py-4 sm:px-8 sm:py-6 space-y-5',
      isDark() ? 'bg-zinc-950' : 'bg-slate-100',
    ]"
  >
    <header
      class="rounded-2xl border px-4 py-4 shadow-sm sm:px-8 sm:py-5"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-white'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border text-slate-500 transition cursor-pointer group overflow-hidden shrink-0"
            :class="
              isDark()
                ? 'border-zinc-700/60 hover:bg-transparent hover:text-white'
                : 'border-slate-200 hover:bg-white hover:text-slate-900'
            "
            aria-label="Volver"
            @click="goBack"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <div>
            <h1 class="text-xl font-semibold sm:text-2xl">
              {{ headerName }}
            </h1>
            <p
              class="text-xs"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              Historial de reportes diarios
            </p>
          </div>
        </div>
      </div>
    </header>

    <section
      class="rounded-2xl border px-4 py-4 shadow-sm sm:px-6 sm:py-5"
      :class="
        isDark()
          ? 'border-zinc-800/70 text-white'
          : 'border-slate-200/70 text-slate-900'
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

      <div
        v-else
        class="mt-4 divide-y"
        :class="isDark() ? 'divide-zinc-800/70' : 'divide-slate-200'"
      >
        <button
          v-for="row in rows"
          :key="String(row.id ?? row.weekEndDate)"
          type="button"
          class="w-full py-4 text-left transition flex items-center gap-3"
          :class="isDark() ? 'hover:bg-zinc-950/30' : 'hover:bg-slate-50'"
          @click="openReport(row)"
        >
          <div class="min-w-0 flex-1">
            <div class="text-base font-semibold truncate">
              {{ weekdayEs(row.weekEndDate) }} {{ ddmmyyyy(row.weekEndDate) }}
            </div>
            <div
              class="text-xs mt-0.5"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              Boxeo {{ toNum(row.boxeoCoins) }} · Devueltas
              {{ toNum(row.boxeoReturned) }} · Agilidad
              {{ toNum(row.agilidadCoins) }} · Perdidas
              {{ toNum(row.agilidadLost) }}
            </div>
          </div>

          <div class="text-right">
            <div
              class="text-xs"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              Total
            </div>
            <div class="text-base font-semibold">
              {{ toNum(row.total).toFixed(2) }}
            </div>
          </div>

          <span
            class="ml-2 text-lg"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-400'"
            aria-hidden="true"
            >›</span
          >
        </button>

        <p
          v-if="rows.length === 0"
          class="py-6 text-sm"
          :class="isDark() ? 'text-zinc-300' : 'text-slate-600'"
        >
          No hay reportes.
        </p>
      </div>
    </section>
  </div>
</template>
