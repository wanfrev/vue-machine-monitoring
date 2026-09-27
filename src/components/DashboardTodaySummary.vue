<script setup lang="ts">
/* global defineProps */
import { computed, onMounted, onUnmounted, ref } from "vue";
import { startVisiblePolling } from "@/utils/visiblePolling";
import { useRouter } from "vue-router";
import {
  getDailySales,
  getEmployeeSalesSummary,
  getWeeklyReports,
} from "@/api/client";
import { useCoinValues } from "@/composables/useCoinValues";
import { getIncomeFromCoins } from "@/utils/machine";
import { getTodayLocalStr, formatTimeShort } from "@/utils/date";
import type { Machine } from "@/types/machine";

type OperatorRow = {
  employeeId: number;
  name: string;
  machineNames: string[];
  registeredCoins: number;
  reportSentAt: string | null;
  reportSent: boolean;
};

const props = defineProps<{
  machines: Machine[];
  dailyCoinsByMachine: Record<string, number>;
  totalCoinsToday: number;
  activeMachines: number;
  inactiveMachines: number;
  dark: boolean;
}>();

const router = useRouter();
const { coinValues } = useCoinValues();

const rows = ref<OperatorRow[]>([]);
const registeredByMachine = ref<Record<string, number>>({});
const loaded = ref(false);
const open = ref(false);
let stopPolling: (() => void) | undefined;

const incomeToday = computed(() => {
  coinValues.value;
  return props.machines.reduce(
    (sum, m) =>
      sum +
      getIncomeFromCoins(registeredByMachine.value[m.id] || 0, m.name, m.type),
    0
  );
});

const sentCount = computed(() => rows.value.filter((r) => r.reportSent).length);
const pendingCount = computed(() => rows.value.length - sentCount.value);

const sortedRows = computed(() =>
  [...rows.value].sort((a, b) => {
    if (a.reportSent !== b.reportSent) return a.reportSent ? 1 : -1;
    return a.name.localeCompare(b.name);
  })
);

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function load() {
  const today = getTodayLocalStr();
  try {
    const [summary, reports, sales] = await Promise.all([
      getEmployeeSalesSummary({ startDate: today, endDate: today }),
      getWeeklyReports({
        startDate: today,
        endDate: today,
        reportKind: "diario",
      }),
      getDailySales({ startDate: today, endDate: today }),
    ]);

    const byMachine: Record<string, number> = {};
    for (const r of Array.isArray(sales) ? sales : []) {
      const id = String(r?.machineId ?? "");
      if (id) byMachine[id] = (byMachine[id] || 0) + (Number(r?.coins) || 0);
    }
    registeredByMachine.value = byMachine;

    const sentAt = new Map<number, string>();
    for (const r of Array.isArray(reports) ? reports : []) {
      const id = toNum(r?.employeeId ?? r?.employee_id);
      if (!id) continue;
      const created = String(r?.createdAt ?? r?.created_at ?? "");
      const prev = sentAt.get(id);
      if (!prev || created > prev) sentAt.set(id, created);
    }

    rows.value = (Array.isArray(summary) ? summary : [])
      .map((s) => {
        const employeeId = toNum(s?.employeeId ?? s?.employee_id);
        return {
          employeeId,
          name: String(s?.employeeName || s?.employeeUsername || "Operadora"),
          machineNames: Array.isArray(s?.machineNames)
            ? s.machineNames.map((m: unknown) => String(m))
            : [],
          registeredCoins: toNum(s?.totalCoins ?? s?.total_coins),
          reportSent: sentAt.has(employeeId),
          reportSentAt: sentAt.get(employeeId) || null,
        };
      })
      .filter((r) => r.employeeId > 0);
  } catch {
    rows.value = [];
  } finally {
    loaded.value = true;
  }
}

function openEmployee(row: OperatorRow) {
  router.push({
    name: "employee-report-detail",
    params: { employeeId: String(row.employeeId) },
    query: { employeeName: row.name },
  });
}

onMounted(() => {
  void load();
  stopPolling = startVisiblePolling(() => load(), 30000);
});

onUnmounted(() => {
  stopPolling?.();
});
</script>

<template>
  <section
    class="rounded-2xl border px-3 py-2.5 shadow-sm sm:px-4"
    :class="
      dark
        ? 'border-zinc-800/70 bg-zinc-900/70 text-zinc-100'
        : 'border-slate-200/70 bg-white/60 text-slate-900'
    "
    aria-label="Resumen de hoy"
  >
    <div class="grid grid-cols-3 gap-2 text-center">
      <div>
        <p class="text-lg font-semibold leading-none">
          {{ activeMachines
          }}<span
            class="text-xs font-normal"
            :class="dark ? 'text-zinc-500' : 'text-slate-400'"
            >/{{ activeMachines + inactiveMachines }}</span
          >
        </p>
        <p
          class="mt-1 text-[11px]"
          :class="dark ? 'text-zinc-400' : 'text-slate-500'"
        >
          encendidas
        </p>
      </div>
      <div>
        <p class="text-lg font-semibold leading-none">$ {{ incomeToday }}</p>
        <p
          class="mt-1 text-[11px]"
          :class="dark ? 'text-zinc-400' : 'text-slate-500'"
        >
          hoy
        </p>
      </div>
      <button
        type="button"
        class="rounded-lg"
        :aria-expanded="open"
        @click="open = !open"
      >
        <p
          class="text-lg font-semibold leading-none"
          :class="
            pendingCount > 0 ? (dark ? 'text-amber-300' : 'text-amber-600') : ''
          "
        >
          {{ sentCount }}/{{ rows.length }}
        </p>
        <p
          class="mt-1 text-[11px]"
          :class="dark ? 'text-zinc-400' : 'text-slate-500'"
        >
          reportes {{ open ? "▴" : "▾" }}
        </p>
      </button>
    </div>

    <ul
      v-if="open"
      class="mt-2 divide-y border-t"
      :class="
        dark
          ? 'divide-zinc-800/70 border-zinc-800/70'
          : 'divide-slate-200/70 border-slate-200/70'
      "
    >
      <li v-if="loaded && rows.length === 0" class="py-2 text-sm">
        No hay operadoras asignadas a tus máquinas.
      </li>
      <li v-for="row in sortedRows" :key="row.employeeId">
        <button
          type="button"
          class="flex w-full items-center gap-3 py-2 text-left"
          @click="openEmployee(row)"
        >
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ row.name }}</p>
            <p
              class="truncate text-xs"
              :class="dark ? 'text-zinc-400' : 'text-slate-500'"
            >
              {{ row.machineNames.join(" · ") || "Sin máquinas" }} ·
              {{ row.registeredCoins }} monedas
            </p>
          </div>
          <span
            class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
            :class="
              row.reportSent
                ? dark
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-amber-50 text-amber-700'
                : dark
                ? 'bg-orange-500/15 text-orange-300'
                : 'bg-orange-50 text-orange-700'
            "
          >
            {{
              row.reportSent
                ? `Enviado ${formatTimeShort(row.reportSentAt)}`
                : "Pendiente"
            }}
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>
