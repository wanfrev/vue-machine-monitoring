<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import AppSidebar from "@/components/AppSidebar.vue";
import { useTheme } from "@/composables/useTheme";
import { getDailySales, getMachines, upsertDailySale } from "@/api/client";
import { getTodayLocalStr } from "@/utils/date";
import { useCurrentUser } from "@/composables/useCurrentUser";
import { filterMachinesForRole } from "@/utils/access";
import { addLocalSaleEntry } from "@/utils/localSalesHistory";

type Machine = {
  id: string;
  name?: string;
  location?: string;
  type?: string;
};

type DailySaleRow = {
  id?: number;
  machineId: string;
  date: string;
  coins: number;
  recordMessage?: string | null;
  prizeBs?: number | null;
  employeeUsername?: string;
  employeeName?: string;
  updatedAt?: string;
};

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;

const sidebarOpen = ref(false);
const loading = ref(false);
const saving = ref(false);

const { currentRole, assignedMachineIds, isAdmin } = useCurrentUser();

const machines = ref<Machine[]>([]);
const machineId = ref<string>("");
const date = ref<string>(getTodayLocalStr());

const coins = ref<number | null>(null);
const prizeBs = ref<number | null>(null);
const recordMessage = ref<string>("");

const loadingExisting = ref(false);
const existingSale = ref<DailySaleRow | null>(null);

function apiErrorMessage(e: unknown): string {
  const msg = (e as { response?: { data?: { message?: string } } })?.response
    ?.data?.message;
  return msg || "Ocurrió un error";
}

function toNonNegInt(value: number | null): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.trunc(n);
}

function toNonNegMoneyOrNull(value: number | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

const selectedMachineLabel = computed(() => {
  const m = machines.value.find((x) => x.id === machineId.value);
  if (!m) return "—";
  const parts = [m.name || m.id, m.location].filter(Boolean);
  return parts.join(" · ");
});

const hasNoAssignedMachines = computed(() => {
  return !isAdmin.value && machines.value.length === 0;
});

function compareMachineLabel(a: Machine, b: Machine): number {
  const labelA = a.name || a.id || "";
  const labelB = b.name || b.id || "";
  return labelA.localeCompare(labelB, "es", { sensitivity: "base" });
}

async function loadMachines() {
  loading.value = true;
  try {
    const rows = (await getMachines()) as Machine[];
    const all = Array.isArray(rows) ? rows : [];
    machines.value = filterMachinesForRole(all, {
      role: currentRole.value,
      assignedMachineIds: assignedMachineIds.value,
    }).sort(compareMachineLabel);

    // If the selected machine is not allowed, clear it.
    if (
      machineId.value &&
      !machines.value.some((m) => m.id === machineId.value)
    ) {
      machineId.value = "";
    }

    if (!machineId.value && machines.value.length === 1) {
      machineId.value = machines.value[0]?.id || "";
    }
    if (!machineId.value && machines.value.length > 0) {
      machineId.value = machines.value[0]?.id || "";
    }
  } catch (e) {
    window.alert(apiErrorMessage(e));
  } finally {
    loading.value = false;
  }
}

function pickMySale(rows: any[]): DailySaleRow | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const username = localStorage.getItem("username") || "";
  if (username) {
    const mine = rows.find(
      (r) => String(r?.employeeUsername || "") === username
    );
    if (mine) return mine as DailySaleRow;
  }

  if (rows.length === 1) return rows[0] as DailySaleRow;
  return null;
}

async function loadExistingSale() {
  if (!machineId.value || !date.value) {
    existingSale.value = null;
    return;
  }

  loadingExisting.value = true;
  try {
    const rows = (await getDailySales({
      startDate: date.value,
      endDate: date.value,
      machineId: machineId.value,
    })) as any[];

    existingSale.value = pickMySale(rows);
  } catch {
    // Silencioso: no bloquear el formulario si falla la consulta
    existingSale.value = null;
  } finally {
    loadingExisting.value = false;
  }
}

async function saveDaily() {
  if (!machineId.value) {
    window.alert("Selecciona una máquina");
    return;
  }
  if (!date.value) {
    window.alert("Selecciona la fecha");
    return;
  }

  saving.value = true;
  try {
    const coinInput = toNonNegInt(coins.value);
    const prizeValue = toNonNegMoneyOrNull(prizeBs.value);
    const noteValue = recordMessage.value.trim() || null;
    const saved = (await upsertDailySale({
      machineId: machineId.value,
      date: date.value,
      coins: coinInput,
      prizeBs: prizeValue,
      recordMessage: noteValue,
    })) as DailySaleRow;

    existingSale.value = saved;
    if (!isAdmin.value && (coinInput > 0 || prizeValue !== null || noteValue)) {
      addLocalSaleEntry({
        machineId: machineId.value,
        date: date.value,
        coins: coinInput,
        prizeBs: prizeValue,
        lost: null,
        returned: null,
        recordMessage: noteValue,
        createdAt: new Date().toISOString(),
        employeeUsername: localStorage.getItem("username") || undefined,
      });
    }

    coins.value = 0;
    prizeBs.value = 0;
    recordMessage.value = "";
    window.alert("Venta diaria guardada");
  } catch (e) {
    window.alert(apiErrorMessage(e));
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadMachines();
});

watch([machineId, date], () => {
  void loadExistingSale();
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
              <h1 class="text-xl font-semibold sm:text-2xl">Ventas diarias</h1>
              <span
                class="text-xs font-medium tracking-wide"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                Registro por máquina
              </span>
            </div>
            <p
              class="mt-1 text-sm truncate"
              :class="isDark() ? 'text-zinc-300' : 'text-slate-600'"
            >
              {{ selectedMachineLabel }}
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
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="grid gap-1">
          <span
            class="text-xs"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >Fecha</span
          >
          <input
            v-model="date"
            type="date"
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
            >Máquina</span
          >
          <select
            v-model="machineId"
            class="app-select h-10 rounded-xl border px-3 text-sm outline-none"
            :class="
              isDark()
                ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            "
            :disabled="loading || machines.length === 0"
          >
            <option value="" disabled>Selecciona…</option>
            <option v-for="m in machines" :key="m.id" :value="m.id">
              {{ m.name || m.id }}
            </option>
          </select>

          <p
            v-if="hasNoAssignedMachines"
            class="text-xs"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            No tienes máquinas asignadas.
          </p>
        </label>

        <label class="grid gap-1">
          <span
            class="text-xs"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >Monedas</span
          >
          <input
            v-model.number="coins"
            type="number"
            min="0"
            step="1"
            class="h-10 rounded-xl border px-3 text-sm outline-none"
            :class="
              isDark()
                ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            "
            placeholder="0"
          />
        </label>

        <label class="grid gap-1">
          <span
            class="text-xs"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >Premio (Bs) (opcional)</span
          >
          <input
            v-model.number="prizeBs"
            type="number"
            min="0"
            step="0.01"
            class="h-10 rounded-xl border px-3 text-sm outline-none"
            :class="
              isDark()
                ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            "
            placeholder="0,00"
          />
        </label>

        <label class="grid gap-1 sm:col-span-2">
          <span
            class="text-xs"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >Nota (opcional)</span
          >
          <input
            v-model="recordMessage"
            type="text"
            class="h-10 rounded-xl border px-3 text-sm outline-none"
            :class="
              isDark()
                ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            "
            placeholder="Ej: cambio de operador, incidencia, etc."
          />
        </label>
      </div>

      <div class="mt-5 flex items-center justify-end gap-3">
        <button
          type="button"
          class="h-10 rounded-xl border px-4 text-sm font-medium transition cursor-pointer"
          :class="
            isDark()
              ? 'border-zinc-800/70 bg-zinc-950/20 text-zinc-200 hover:bg-zinc-100/10'
              : 'border-slate-200/80 bg-white/70 text-slate-700 hover:bg-slate-50'
          "
          :disabled="loading"
          @click="loadMachines"
        >
          Recargar máquinas
        </button>

        <button
          type="button"
          class="h-10 rounded-xl border px-4 text-sm font-semibold transition cursor-pointer"
          :class="
            isDark()
              ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/25'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100/60'
          "
          :disabled="saving || loading"
          @click="saveDaily"
        >
          {{ saving ? "Guardando…" : "Guardar" }}
        </button>
      </div>

      <div
        class="mt-6 rounded-2xl border p-4"
        :class="
          isDark()
            ? 'border-zinc-800/70 bg-zinc-950/20'
            : 'border-slate-200 bg-white/50'
        "
      >
        <h3 class="text-sm font-semibold">Registro guardado</h3>

        <p
          v-if="loadingExisting"
          class="mt-2 text-sm"
          :class="isDark() ? 'text-zinc-300' : 'text-slate-600'"
        >
          Cargando…
        </p>

        <div v-else-if="existingSale" class="mt-3 grid gap-2 text-sm">
          <div class="flex items-center justify-between gap-3">
            <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >Monedas</span
            >
            <span class="font-semibold">{{ existingSale.coins }}</span>
          </div>
          <div class="flex items-center justify-between gap-3">
            <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >Premio (Bs)</span
            >
            <span class="font-semibold">{{ existingSale.prizeBs ?? 0 }}</span>
          </div>
          <div class="grid gap-1">
            <span :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >Nota</span
            >
            <span class="break-words">{{
              existingSale.recordMessage || "—"
            }}</span>
          </div>
          <p
            v-if="existingSale.updatedAt"
            class="text-xs"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Última actualización: {{ String(existingSale.updatedAt) }}
          </p>
        </div>

        <p
          v-else
          class="mt-2 text-sm"
          :class="isDark() ? 'text-zinc-300' : 'text-slate-600'"
        >
          No hay registro guardado para esa máquina y fecha.
        </p>
      </div>
    </section>
  </div>
</template>
