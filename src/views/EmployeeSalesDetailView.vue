<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTheme } from "@/composables/useTheme";
import { getDailySaleEntries, getEmployeeSalesSummary } from "@/api/client";

type DailySaleRow = {
  id?: number;
  employeeId?: number;
  employeeName?: string;
  employeeUsername?: string;
  machineId?: string;
  machineName?: string;
  date: string;
  coins: number;
  recordMessage?: string | null;
  prizeBs?: number | null;
  lost?: number | null;
  returned?: number | null;
  createdAt?: string;
};

const route = useRoute();
const router = useRouter();

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;

const sidebarOpen = ref(false);
const loading = ref(false);
const error = ref("");
const rows = ref<DailySaleRow[]>([]);
const assignedMachines = ref<string[]>([]);

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

function normalizeSale(row: unknown): DailySaleRow | null {
  const rec = asRecord(row);
  if (!rec) return null;
  return {
    id: typeof rec.id === "number" ? rec.id : undefined,
    employeeId: toNum(pick(rec, ["employeeId", "employee_id"])) || undefined,
    employeeName: String(pick(rec, ["employeeName", "employee_name"]) || ""),
    employeeUsername: String(
      pick(rec, ["employeeUsername", "employee_username"]) || ""
    ),
    machineId: String(pick(rec, ["machineId", "machine_id"]) || ""),
    machineName: String(pick(rec, ["machineName", "machine_name"]) || ""),
    date: String(pick(rec, ["date", "sale_date"]) || ""),
    coins: toNum(pick(rec, ["coins"])),
    recordMessage: String(pick(rec, ["recordMessage", "record_message"]) || ""),
    prizeBs: toNum(pick(rec, ["prizeBs", "prize_bs"])) || 0,
    lost: toNum(pick(rec, ["lost"])),
    returned: toNum(pick(rec, ["returned"])),
    createdAt: String(pick(rec, ["createdAt", "created_at"]) || ""),
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

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const totalCoins = computed(() =>
  rows.value.reduce((acc, row) => acc + (row.coins || 0), 0)
);

function goBack() {
  router.push({ name: "reports" });
}

async function loadSales() {
  if (!employeeId.value) {
    error.value = "Empleado no valido.";
    return;
  }

  loading.value = true;
  error.value = "";
  try {
    const [entries, summary] = await Promise.all([
      getDailySaleEntries({ employeeId: employeeId.value }),
      getEmployeeSalesSummary({ employeeId: employeeId.value }),
    ]);
    const summaryRow = Array.isArray(summary) ? summary[0] : null;
    if (summaryRow && Array.isArray(summaryRow.machineNames)) {
      assignedMachines.value = summaryRow.machineNames.map((m: unknown) =>
        String(m)
      );
    } else {
      assignedMachines.value = [];
    }

    rows.value = (Array.isArray(entries) ? entries : [])
      .map((row) => normalizeSale(row))
      .filter(Boolean) as DailySaleRow[];
  } catch (e) {
    error.value = apiErrorMessage(e);
    rows.value = [];
    assignedMachines.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadSales();
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
              Historial de ventas
            </p>
            <p
              class="text-xs mt-1"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              Maquinas asignadas:
              <span class="font-medium">
                {{
                  assignedMachines.length
                    ? assignedMachines.join(" · ")
                    : "Sin maquinas"
                }}
              </span>
            </p>
          </div>
        </div>

        <div class="text-right">
          <div
            class="text-xs"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Total acumulado
          </div>
          <div class="text-lg font-semibold">
            {{ totalCoins.toLocaleString("es-VE") }}
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

      <div v-else class="space-y-3">
        <div
          v-for="row in rows"
          :key="String(row.id || '') + '-' + row.date + '-' + row.machineName"
          class="grid gap-2 rounded-2xl border px-3 py-3 shadow-sm sm:px-4"
          :class="
            isDark()
              ? 'bg-zinc-900/60 border-zinc-800/70'
              : 'bg-white/70 border-slate-200/70'
          "
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="text-sm font-semibold truncate">
                {{ row.machineName || "Maquina" }}
              </div>
              <div
                class="text-[11px] mt-0"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                {{ ddmmyyyy(row.date) || row.date }}
                <span v-if="formatTime(row.createdAt)" class="ml-2">
                  {{ formatTime(row.createdAt) }}
                </span>
              </div>
            </div>

            <div
              class="rounded-md border px-2 py-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] w-fit ml-auto shrink-0"
              :class="
                isDark()
                  ? 'border-zinc-800/70 bg-zinc-950/40'
                  : 'border-slate-200 bg-white/70'
              "
            >
              <div class="flex items-center justify-between gap-2">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'">
                  Devuelta
                </span>
                <span
                  class="font-semibold"
                  :class="isDark() ? 'text-amber-200' : 'text-amber-700'"
                >
                  {{ (row.returned || 0).toLocaleString("es-VE") }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-2">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'">
                  Monedas
                </span>
                <span class="font-semibold">
                  {{ row.coins.toLocaleString("es-VE") }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-2">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'">
                  Perdidas
                </span>
                <span
                  class="font-semibold"
                  :class="isDark() ? 'text-rose-200' : 'text-rose-700'"
                >
                  {{ (row.lost || 0).toLocaleString("es-VE") }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-2">
                <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'">
                  Record
                </span>
                <span
                  class="font-semibold"
                  :class="isDark() ? 'text-emerald-200' : 'text-emerald-700'"
                >
                  {{ (row.prizeBs || 0).toLocaleString("es-VE") }}
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="row.recordMessage"
            class="rounded-lg border px-2 py-0.5 text-[11px]"
            :class="
              isDark()
                ? 'border-zinc-800/70 bg-zinc-950/40 text-zinc-200'
                : 'border-slate-200 bg-white/60 text-slate-700'
            "
          >
            <div
              class="text-[9px] uppercase tracking-wide"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              Incidente
            </div>
            <div class="mt-0 break-words">
              {{ row.recordMessage }}
            </div>
          </div>
        </div>

        <p
          v-if="rows.length === 0"
          class="py-6 text-sm"
          :class="isDark() ? 'text-zinc-300' : 'text-slate-600'"
        >
          Sin registros.
        </p>
      </div>
    </section>
  </div>
</template>
