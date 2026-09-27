<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  getDailySaleEntries,
  getEmployeeSalesSummary,
  getWeeklyReports,
} from "@/api/client";
import { useTheme } from "@/composables/useTheme";
import {
  formatLocalYmd,
  formatTimeShort,
  getTodayLocalStr,
} from "@/utils/date";

type Report = {
  id: number | string;
  date: string;
  boxeoCoins: number;
  boxeoReturned: number;
  boxeoLost: number;
  agilidadCoins: number;
  agilidadReturned: number;
  agilidadLost: number;
  remainingCoins: number;
  pagoMovil: number;
  dolares: number;
  bolivares: number;
  premio: number;
  total: number;
  updatedAt: string;
};
type Incident = { message: string; machine: string };
type Row =
  | { kind: "week"; key: string; label: string; sent: number; total: number }
  | { kind: "report"; key: string; report: Report }
  | { kind: "missing"; key: string; date: string };

const route = useRoute();
const router = useRouter();
const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;

const loading = ref(true);
const error = ref("");
const reports = ref<Report[]>([]);
const machines = ref<string[]>([]);
const expandedId = ref<string | number | null>(null);
const incidents = ref<Record<string, Incident[]>>({});
const showAll = ref(false);

const FETCH_DAYS = 60;
const SHORT_DAYS = 14;

const employeeId = computed(() => {
  const id = Number(route.params.employeeId ?? route.query.employeeId);
  return Number.isFinite(id) && id > 0 ? id : null;
});
const name = computed(
  () => String(route.query.employeeName || "").trim() || "Operadora"
);

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

function parse(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function dayLabel(ymd: string): string {
  if (ymd === getTodayLocalStr()) return "Hoy";
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (ymd === formatLocalYmd(y)) return "Ayer";
  const dt = parse(ymd);
  return `${WEEKDAYS[dt.getDay()]} ${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
}

function mondayKey(ymd: string): string {
  const dt = parse(ymd);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return formatLocalYmd(dt);
}

function weekLabel(key: string): string {
  const now = mondayKey(getTodayLocalStr());
  if (key === now) return "Esta semana";
  const prev = parse(now);
  prev.setDate(prev.getDate() - 7);
  if (key === formatLocalYmd(prev)) return "Semana pasada";
  const mon = parse(key);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return `${mon.getDate()} ${MONTHS[mon.getMonth()]} – ${sun.getDate()} ${
    MONTHS[sun.getMonth()]
  }`;
}

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function pick(r: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) if (k in r) return r[k];
  return undefined;
}

function toReport(raw: Record<string, unknown>): Report {
  const date = String(pick(raw, "weekEndDate", "week_end_date") ?? "").slice(
    0,
    10
  );
  return {
    id: (pick(raw, "id") as number | string) ?? date,
    date,
    boxeoCoins: n(pick(raw, "boxeoCoins", "boxeo_coins")),
    boxeoReturned: n(pick(raw, "boxeoReturned", "boxeo_returned")),
    boxeoLost: n(pick(raw, "boxeoLost", "boxeo_lost")),
    agilidadCoins: n(pick(raw, "agilidadCoins", "agilidad_coins")),
    agilidadReturned: n(pick(raw, "agilidadReturned", "agilidad_returned")),
    agilidadLost: n(pick(raw, "agilidadLost", "agilidad_lost")),
    remainingCoins: n(pick(raw, "remainingCoins", "remaining_coins")),
    pagoMovil: n(pick(raw, "pagoMovil", "pago_movil")),
    dolares: n(pick(raw, "dolares")),
    bolivares: n(pick(raw, "bolivares")),
    premio: n(pick(raw, "premio")),
    total: n(pick(raw, "total")),
    updatedAt: String(
      pick(raw, "updatedAt", "updated_at", "createdAt", "created_at") ?? ""
    ),
  };
}

const byDate = computed(() => {
  const map = new Map<string, Report>();
  for (const r of reports.value) {
    const prev = map.get(r.date);
    if (!prev || r.updatedAt > prev.updatedAt) map.set(r.date, r);
  }
  return map;
});

const sentToday = computed(() => byDate.value.has(getTodayLocalStr()));

// Últimos 7 días (incluye hoy): cuántos reportes y cuáles faltaron.
const lastSeven = computed(() => {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(formatLocalYmd(d));
  }
  const sent = days.filter((d) => byDate.value.has(d));
  const today = getTodayLocalStr();
  const missing = days.filter((d) => !byDate.value.has(d) && d !== today);
  const sold = sent.reduce((s, d) => {
    const r = byDate.value.get(d)!;
    return s + r.boxeoCoins + r.agilidadCoins;
  }, 0);
  const total = sent.reduce((s, d) => s + byDate.value.get(d)!.total, 0);
  return { sent: sent.length, missing, sold, total };
});

const rows = computed<Row[]>(() => {
  const limit = showAll.value ? FETCH_DAYS : SHORT_DAYS;
  const today = getTodayLocalStr();
  const out: Row[] = [];
  let currentWeek = "";
  let header: Extract<Row, { kind: "week" }> | null = null;
  for (let i = 0; i < limit; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = formatLocalYmd(d);
    const report = byDate.value.get(date);
    // Un "hoy" sin reporte no es una falta todavía: el turno sigue abierto.
    if (!report && date === today) continue;
    const week = mondayKey(date);
    if (week !== currentWeek) {
      currentWeek = week;
      header = {
        kind: "week",
        key: `w-${week}`,
        label: weekLabel(week),
        sent: 0,
        total: 0,
      };
      out.push(header);
    }
    if (report) {
      header!.sent += 1;
      header!.total += report.total;
      out.push({ kind: "report", key: String(report.id), report });
    } else {
      out.push({ kind: "missing", key: `m-${date}`, date });
    }
  }
  return out;
});

function alertsOf(r: Report): string[] {
  const list: string[] = [];
  const lost = r.boxeoLost + r.agilidadLost;
  const returned = r.boxeoReturned + r.agilidadReturned;
  if (lost > 0) list.push(`${lost} perdida${lost > 1 ? "s" : ""}`);
  if (returned > 0) list.push(`${returned} devuelta${returned > 1 ? "s" : ""}`);
  if (r.premio > 0) list.push("premio");
  return list;
}

async function load() {
  if (!employeeId.value) {
    error.value = "Operadora no válida.";
    loading.value = false;
    return;
  }
  const start = new Date();
  start.setDate(start.getDate() - (FETCH_DAYS - 1));
  try {
    const [data, summary] = await Promise.all([
      getWeeklyReports({
        employeeId: employeeId.value,
        reportKind: "diario",
        startDate: formatLocalYmd(start),
        endDate: getTodayLocalStr(),
      }),
      getEmployeeSalesSummary({ employeeId: employeeId.value }),
    ]);
    reports.value = (Array.isArray(data) ? data : [])
      .map((r) => toReport(r as Record<string, unknown>))
      .filter((r) => r.date);
    const first = Array.isArray(summary) ? summary[0] : null;
    machines.value = Array.isArray(first?.machineNames)
      ? first.machineNames.map((m: unknown) => String(m))
      : [];
  } catch {
    error.value = "No se pudieron cargar los reportes. Intenta de nuevo.";
  } finally {
    loading.value = false;
  }
}

async function toggle(r: Report) {
  const key = String(r.id);
  if (expandedId.value === r.id) {
    expandedId.value = null;
    return;
  }
  expandedId.value = r.id;
  if (incidents.value[key] || !employeeId.value) return;
  try {
    const entries = await getDailySaleEntries({
      employeeId: employeeId.value,
      startDate: r.date,
      endDate: r.date,
    });
    incidents.value = {
      ...incidents.value,
      [key]: (Array.isArray(entries) ? entries : [])
        .filter((e) => String(e?.recordMessage || "").trim())
        .map((e) => ({
          message: String(e.recordMessage),
          machine: String(e?.machineName || ""),
        })),
    };
  } catch {
    incidents.value = { ...incidents.value, [key]: [] };
  }
}

function goBack() {
  if (window.history.state?.back) router.back();
  else router.push({ name: "employees" });
}

function money(v: number): string {
  return v.toFixed(2);
}

onMounted(load);
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
        aria-label="Volver"
        @click="goBack"
      >
        ←
      </button>
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-lg font-semibold leading-tight">{{ name }}</h1>
        <p
          class="truncate text-xs"
          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
        >
          {{ machines.join(" · ") || "Sin máquinas asignadas" }}
        </p>
      </div>
      <span
        v-if="!loading && !error"
        class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium"
        :class="
          sentToday
            ? isDark()
              ? 'bg-amber-500/15 text-amber-300'
              : 'bg-amber-50 text-amber-700'
            : isDark()
            ? 'bg-orange-500/15 text-orange-300'
            : 'bg-orange-50 text-orange-700'
        "
      >
        {{ sentToday ? "Envió hoy" : "Sin reporte hoy" }}
      </span>
    </header>

    <p v-if="loading" class="px-1 py-4 text-sm opacity-70">Cargando…</p>
    <p v-else-if="error" class="px-1 py-4 text-sm text-rose-500">{{ error }}</p>

    <template v-else>
      <section
        class="rounded-2xl border px-4 py-3 shadow-sm"
        :class="
          isDark()
            ? 'border-zinc-800/70 bg-zinc-900/70'
            : 'border-slate-200/70 bg-white/70'
        "
        aria-label="Últimos 7 días"
      >
        <p
          class="text-xs font-medium uppercase tracking-wide"
          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
        >
          Últimos 7 días
        </p>
        <div class="mt-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <p class="text-xl font-semibold leading-none">
              {{ lastSeven.sent
              }}<span class="text-sm font-normal opacity-50">/7</span>
            </p>
            <p
              class="mt-1 text-[11px]"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              reportes enviados
            </p>
          </div>
          <div>
            <p class="text-xl font-semibold leading-none">
              {{ lastSeven.sold }}
            </p>
            <p
              class="mt-1 text-[11px]"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              monedas vendidas
            </p>
          </div>
          <div>
            <p class="text-xl font-semibold leading-none">
              {{ money(lastSeven.total) }}
            </p>
            <p
              class="mt-1 text-[11px]"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              total
            </p>
          </div>
        </div>
        <p
          v-if="lastSeven.missing.length"
          class="mt-3 rounded-lg px-3 py-2 text-xs"
          :class="
            isDark()
              ? 'bg-amber-500/10 text-amber-300'
              : 'bg-amber-50 text-amber-700'
          "
        >
          Sin reporte:
          {{ lastSeven.missing.map(dayLabel).join(" · ") }}
        </p>
      </section>

      <section
        class="rounded-2xl border px-3 py-2 shadow-sm sm:px-4"
        :class="
          isDark()
            ? 'border-zinc-800/70 bg-zinc-900/70'
            : 'border-slate-200/70 bg-white/70'
        "
        aria-label="Reportes diarios"
      >
        <p v-if="reports.length === 0" class="py-6 text-sm opacity-70">
          Todavía no hay reportes diarios de esta operadora.
        </p>

        <ul v-else>
          <template v-for="row in rows" :key="row.key">
            <li
              v-if="row.kind === 'week'"
              class="flex items-baseline justify-between pb-1 pt-3 text-xs font-semibold uppercase tracking-wide"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              <span>{{ row.label }}</span>
              <span class="font-normal normal-case">
                {{ row.sent }} reportes · total {{ money(row.total) }}
              </span>
            </li>

            <li
              v-else-if="row.kind === 'missing'"
              class="flex items-center justify-between border-t py-2.5 text-sm"
              :class="
                isDark()
                  ? 'border-zinc-800/70 text-amber-300'
                  : 'border-slate-200/70 text-amber-700'
              "
            >
              <span>{{ dayLabel(row.date) }}</span>
              <span class="text-xs">Sin reporte</span>
            </li>

            <li
              v-else
              class="border-t"
              :class="isDark() ? 'border-zinc-800/70' : 'border-slate-200/70'"
            >
              <button
                type="button"
                class="flex w-full items-center gap-3 py-3 text-left"
                @click="toggle(row.report)"
              >
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold">
                    {{ dayLabel(row.report.date) }}
                  </p>
                  <p
                    class="truncate text-xs"
                    :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >
                    Boxeo {{ row.report.boxeoCoins }} · Agilidad
                    {{ row.report.agilidadCoins }}
                  </p>
                  <p
                    v-if="alertsOf(row.report).length"
                    class="mt-0.5 text-[11px] font-medium"
                    :class="isDark() ? 'text-amber-300' : 'text-amber-600'"
                  >
                    {{ alertsOf(row.report).join(" · ") }}
                  </p>
                </div>
                <p class="text-base font-semibold">
                  {{ money(row.report.total) }}
                </p>
                <span
                  class="w-3 text-center"
                  :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
                  aria-hidden="true"
                  >{{ expandedId === row.report.id ? "▴" : "▾" }}</span
                >
              </button>

              <div
                v-if="expandedId === row.report.id"
                class="mb-3 space-y-3 rounded-xl px-3 py-3 text-sm"
                :class="isDark() ? 'bg-zinc-800/50' : 'bg-slate-100'"
              >
                <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                  <p
                    class="col-span-2 text-xs font-semibold uppercase tracking-wide opacity-60"
                  >
                    Boxeo
                  </p>
                  <span>Vendidas</span
                  ><b class="text-right">{{ row.report.boxeoCoins }}</b>
                  <span>Devueltas</span
                  ><b class="text-right">{{ row.report.boxeoReturned }}</b>
                  <span>Perdidas</span
                  ><b class="text-right">{{ row.report.boxeoLost }}</b>

                  <p
                    class="col-span-2 mt-2 text-xs font-semibold uppercase tracking-wide opacity-60"
                  >
                    Agilidad
                  </p>
                  <span>Vendidas</span
                  ><b class="text-right">{{ row.report.agilidadCoins }}</b>
                  <span>Devueltas</span
                  ><b class="text-right">{{ row.report.agilidadReturned }}</b>
                  <span>Perdidas</span
                  ><b class="text-right">{{ row.report.agilidadLost }}</b>

                  <p
                    class="col-span-2 mt-2 text-xs font-semibold uppercase tracking-wide opacity-60"
                  >
                    Cobros
                  </p>
                  <span>Pago móvil</span
                  ><b class="text-right">{{ money(row.report.pagoMovil) }}</b>
                  <span>Dólares</span
                  ><b class="text-right">{{ money(row.report.dolares) }}</b>
                  <span>Bolívares</span
                  ><b class="text-right">{{ money(row.report.bolivares) }}</b>
                  <span>Premio</span
                  ><b class="text-right">{{ money(row.report.premio) }}</b>
                  <span class="font-semibold">Total</span
                  ><b class="text-right">{{ money(row.report.total) }}</b>

                  <span class="mt-2">Monedas restantes</span
                  ><b class="mt-2 text-right">{{
                    row.report.remainingCoins
                  }}</b>
                </div>

                <div v-if="(incidents[String(row.report.id)] || []).length">
                  <p
                    class="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60"
                  >
                    Incidentes del día
                  </p>
                  <p
                    v-for="(inc, i) in incidents[String(row.report.id)]"
                    :key="i"
                    class="text-xs"
                  >
                    “{{ inc.message }}”
                    <span v-if="inc.machine" class="opacity-60">
                      — {{ inc.machine }}</span
                    >
                  </p>
                </div>

                <p
                  v-if="row.report.updatedAt"
                  class="text-[11px]"
                  :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
                >
                  Enviado a las {{ formatTimeShort(row.report.updatedAt) }}
                </p>
              </div>
            </li>
          </template>
        </ul>

        <button
          v-if="reports.length"
          type="button"
          class="my-2 w-full rounded-xl border py-2.5 text-sm font-medium"
          :class="
            isDark()
              ? 'border-zinc-700/60 text-zinc-200'
              : 'border-slate-200 text-slate-600'
          "
          @click="showAll = !showAll"
        >
          {{ showAll ? "Ver solo los últimos 14 días" : "Ver 60 días" }}
        </button>
      </section>
    </template>
  </div>
</template>
