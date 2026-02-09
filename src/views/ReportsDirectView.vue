<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useTheme } from "@/composables/useTheme";
import { getEmployeeSalesSummary } from "@/api/client";

type EmployeeSummary = {
  employeeId: number;
  employeeName?: string;
  employeeUsername?: string;
  machineNames: string[];
  totalCoins: number;
};

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;

const sidebarOpen = ref(false);
const loading = ref(false);
const error = ref("");
const query = ref("");
const rows = ref<EmployeeSummary[]>([]);
const router = useRouter();

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

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((item) => String(item)).filter(Boolean);
}

function normalizeSummary(row: unknown): EmployeeSummary | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const employeeId = Number(pick(rec, ["employeeId", "employee_id"]));
  if (!Number.isFinite(employeeId)) return null;

  return {
    employeeId,
    employeeName: String(pick(rec, ["employeeName", "employee_name"]) || ""),
    employeeUsername: String(
      pick(rec, ["employeeUsername", "employee_username"]) || ""
    ),
    machineNames: toStringArray(pick(rec, ["machineNames", "machine_names"])),
    totalCoins: toNum(pick(rec, ["totalCoins", "total_coins"])),
  };
}

function apiErrorMessage(e: unknown): string {
  const msg = (e as { response?: { data?: { message?: string } } })?.response
    ?.data?.message;
  return msg || "Ocurrio un error";
}

async function loadSummary() {
  loading.value = true;
  error.value = "";
  try {
    const data = await getEmployeeSalesSummary();
    const normalized = (Array.isArray(data) ? data : [])
      .map((row) => normalizeSummary(row))
      .filter(Boolean) as EmployeeSummary[];

    const byEmployee = new Map<number, EmployeeSummary>();
    for (const row of normalized) {
      const existing = byEmployee.get(row.employeeId);
      if (!existing) {
        byEmployee.set(row.employeeId, row);
        continue;
      }
      const mergedNames = new Set([
        ...(existing.machineNames || []),
        ...(row.machineNames || []),
      ]);
      byEmployee.set(row.employeeId, {
        ...existing,
        machineNames: Array.from(mergedNames),
        totalCoins: (existing.totalCoins || 0) + (row.totalCoins || 0),
      });
    }

    rows.value = Array.from(byEmployee.values()).sort(
      (a, b) => (b.totalCoins || 0) - (a.totalCoins || 0)
    );
  } catch (e) {
    error.value = apiErrorMessage(e);
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

const filteredRows = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return rows.value;
  return rows.value.filter((row) => {
    const name = `${row.employeeName || ""} ${row.employeeUsername || ""}`
      .trim()
      .toLowerCase();
    const machines = (row.machineNames || []).join(" ").toLowerCase();
    return name.includes(q) || machines.includes(q);
  });
});

function initialsFor(row: EmployeeSummary): string {
  const base = row.employeeName || row.employeeUsername || "";
  const parts = base.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] || "";
  const second = parts.length > 1 ? parts[1]?.[0] : "";
  return `${first}${second}`.toUpperCase();
}

function openEmployee(row: EmployeeSummary) {
  router.push({
    name: "employee-report-detail",
    params: { employeeId: String(row.employeeId) },
    query: {
      employeeName: row.employeeName || "",
      employeeUsername: row.employeeUsername || "",
    },
  });
}

onMounted(() => {
  void loadSummary();
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
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border text-slate-500 transition cursor-pointer group overflow-hidden shrink-0"
          :class="
            isDark()
              ? 'border-zinc-700/60 hover:bg-transparent hover:text-white'
              : 'border-slate-200 hover:bg-white hover:text-slate-900'
          "
          aria-label="Abrir menu lateral"
          @click="sidebarOpen = true"
        >
          <img
            src="/img/icons/K11BOX.webp"
            alt="MachineHub logo"
            class="h-full w-full object-cover rounded-full"
          />
        </button>
        <div>
          <h1 class="text-xl font-semibold sm:text-2xl">Reportes</h1>
          <p
            class="text-xs"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Supervision general
          </p>
        </div>
      </div>
    </header>

    <section
      class="rounded-2xl border px-4 py-4 shadow-sm sm:px-6 sm:py-5"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-white'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h2 class="text-lg font-semibold">Equipo</h2>
          <p
            class="text-xs"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Quien, donde y cuanto.
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
            placeholder="Nombre o maquina"
          />
        </label>
      </div>

      <p
        v-if="loading"
        class="mt-4 text-sm"
        :class="isDark() ? 'text-zinc-300' : 'text-slate-600'"
      >
        Cargando...
      </p>

      <p
        v-else-if="error"
        class="mt-4 text-sm"
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
          v-for="row in filteredRows"
          :key="row.employeeId"
          type="button"
          class="w-full py-4 text-left transition flex items-center gap-3"
          :class="isDark() ? 'hover:bg-zinc-950/30' : 'hover:bg-slate-50'"
          @click="openEmployee(row)"
        >
          <div
            class="h-11 w-11 rounded-full flex items-center justify-center text-sm font-semibold"
            :class="
              isDark()
                ? 'bg-zinc-800 text-white'
                : 'bg-slate-200 text-slate-700'
            "
          >
            {{ initialsFor(row) }}
          </div>

          <div class="min-w-0 flex-1">
            <div class="text-base font-semibold truncate">
              {{ row.employeeName || row.employeeUsername || "Empleado" }}
            </div>
            <div
              class="text-xs mt-0.5"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              {{
                row.machineNames.length
                  ? row.machineNames.join(" · ")
                  : "Sin maquinas"
              }}
            </div>
          </div>

          <div class="text-right">
            <div
              class="text-xs"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              Total ventas
            </div>
            <div class="text-base font-semibold">
              {{ row.totalCoins.toLocaleString("es-VE") }}
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
          v-if="filteredRows.length === 0"
          class="py-6 text-sm"
          :class="isDark() ? 'text-zinc-300' : 'text-slate-600'"
        >
          No hay reportes.
        </p>
      </div>
    </section>
  </div>
</template>
