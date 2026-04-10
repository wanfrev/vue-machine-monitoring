<script setup lang="ts">
/* global defineProps, defineEmits */
import { computed, onMounted, ref, watch } from "vue";
import MachineStatusMenu from "@/components/MachineStatusMenu.vue";
import { useCoinValues } from "@/composables/useCoinValues";
import {
  getDailySaleEntries,
  getDailySales,
  getWeeklyReports,
  upsertDailySale,
} from "@/api/client";
import {
  getIncomeFromCoins,
  machineStatusDotClass,
  machineStatusLabel,
} from "@/utils/machine";
import { formatCaracasDateTime, getTodayLocalStr } from "@/utils/date";
import { addLocalSaleEntry } from "@/utils/localSalesHistory";
import type { Machine } from "@/types/machine";

const props = defineProps<{
  machine: Machine;
  isDark: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  isMenuOpen: boolean;
  dailyCoins: number;
  weeklyCoins: number;
  firstOnToday?: string;
}>();

const emit = defineEmits<{
  (e: "select", machine: Machine): void;
  (e: "toggle-menu", machineId: string): void;
  (e: "toggle-maintenance", machine: Machine): void;
  (e: "toggle-test-mode", machine: Machine): void;
  (e: "close-menu", machineId: string): void;
}>();

const dark = computed(() => !!props.isDark);

const { coinValues } = useCoinValues();

const incomeToday = computed(() => {
  coinValues.value;
  return getIncomeFromCoins(
    props.dailyCoins,
    props.machine.name,
    props.machine.type
  );
});

const incomeWeek = computed(() => {
  coinValues.value;
  return getIncomeFromCoins(
    props.weeklyCoins,
    props.machine.name,
    props.machine.type
  );
});

const machineTypeLabel = computed(() =>
  String(props.machine?.type || "").toLowerCase()
);
const isBoxeoMachine = computed(() => machineTypeLabel.value.includes("boxeo"));
const isAgilidadMachine = computed(() =>
  machineTypeLabel.value.includes("agilidad")
);
const statusBadgeClass = computed(() => {
  const status = String(props.machine?.status || "inactive");
  if (status === "active") {
    return dark.value
      ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30"
      : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70";
  }
  if (status === "maintenance") {
    return dark.value
      ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30"
      : "bg-amber-50 text-amber-700 ring-1 ring-amber-200/70";
  }
  return dark.value
    ? "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30"
    : "bg-rose-50 text-rose-700 ring-1 ring-rose-200/70";
});

type DailySaleRow = {
  id?: number;
  machineId: string;
  date: string;
  coins: number;
  recordMessage?: string | null;
  prizeBs?: number | null;
  lost?: number | null;
  returned?: number | null;
  employeeUsername?: string;
  employeeName?: string;
  updatedAt?: string;
};

type DailySaleEntryRow = {
  machineId?: string | null;
  machine_id?: string | null;
  machineType?: string | null;
  machine_type?: string | null;
  coins?: number | null;
  createdAt?: string | null;
  created_at?: string | null;
};

type WeeklyReportRow = {
  createdAt?: string | null;
  created_at?: string | null;
};

const date = ref<string>(getTodayLocalStr());
const coins = ref<number>(1);
const recordDigits = ref<string>("");
const recordActive = ref(false);
const recordMessage = ref<string>("");
const saving = ref(false);
const operatorCoins = ref<number>(0);
const machineCoins = ref<number>(0);
const lostCount = ref<number>(0);
const returnedCount = ref<number>(0);
const justSaved = ref(false);
const returnPressFired = ref(false);
let returnPressTimer: number | null = null;

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

function toRecordOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 3 || digits.length > 4) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0 || n > 9999) return null;
  return n;
}

function clampCoins(nextValue: number): number {
  const value = toNonNegInt(nextValue);
  return value < 1 ? 1 : value;
}

function incrementCoins() {
  coins.value = clampCoins(coins.value + 1);
}

function decrementCoins() {
  coins.value = clampCoins(coins.value - 1);
}

function addCoins(amount: number) {
  coins.value = clampCoins(coins.value + amount);
}

function toggleRecord() {
  recordActive.value = !recordActive.value;
  if (!recordActive.value) {
    recordDigits.value = "";
  }
}

function sanitizeRecordInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 4);
}

function handleRecordInput(event: Event) {
  const target = event.target as HTMLInputElement | null;
  if (!target) return;
  recordDigits.value = sanitizeRecordInput(target.value);
}

function clearRecordDigits() {
  recordDigits.value = "";
}

function incrementLost() {
  lostCount.value = toNonNegInt(lostCount.value) + 1;
}

function decrementLost() {
  lostCount.value = Math.max(0, toNonNegInt(lostCount.value) - 1);
}

function startReturnPress() {
  returnPressFired.value = false;
  if (returnPressTimer) {
    window.clearTimeout(returnPressTimer);
  }
  returnPressTimer = window.setTimeout(() => {
    returnedCount.value = 0;
    returnPressFired.value = true;
  }, 600);
}

function endReturnPress() {
  if (returnPressTimer) {
    window.clearTimeout(returnPressTimer);
    returnPressTimer = null;
  }
}

function incrementReturned() {
  if (returnPressFired.value) return;
  returnedCount.value = toNonNegInt(returnedCount.value) + 1;
}

function decrementReturned() {
  returnedCount.value = Math.max(0, toNonNegInt(returnedCount.value) - 1);
}

function stopPropagation(event: Event) {
  event.stopPropagation();
}

function resetTurnForm() {
  coins.value = 1;
  recordDigits.value = "";
  recordActive.value = false;
  recordMessage.value = "";
  lostCount.value = 0;
  returnedCount.value = 0;
  returnPressFired.value = false;
  if (returnPressTimer) {
    window.clearTimeout(returnPressTimer);
    returnPressTimer = null;
  }
}

function handleSelect() {
  if (props.isOperator) return;
  emit("select", props.machine);
}

function handleTopAction() {
  if (props.isOperator) {
    emit("select", props.machine);
    return;
  }
  emit("toggle-menu", props.machine.id);
}

function getEntryMachineType(row: DailySaleEntryRow): string {
  const raw = row.machineType ?? row.machine_type ?? "";
  return String(raw).toLowerCase();
}

function toDateMs(value: string | null | undefined): number {
  if (!value) return 0;
  const date = new Date(value);
  const ms = date.getTime();
  return Number.isFinite(ms) ? ms : 0;
}

async function loadOperatorCoins() {
  if (!props.machine?.id || !date.value) {
    operatorCoins.value = 0;
    return;
  }

  if (props.isOperator) {
    resetTurnForm();
  }

  try {
    if (props.isOperator) {
      const [entries, reports] = await Promise.all([
        getDailySaleEntries({
          startDate: date.value,
          endDate: date.value,
        }),
        getWeeklyReports({
          reportKind: "diario",
          startDate: date.value,
          endDate: date.value,
        }),
      ]);

      const normalizedEntries = Array.isArray(entries) ? entries : [];
      const machineId = String(props.machine.id);

      machineCoins.value = normalizedEntries.reduce((sum, row) => {
        const rec = row as DailySaleEntryRow;
        const entryMachineId = String(rec.machineId ?? rec.machine_id ?? "");
        if (entryMachineId !== machineId) return sum;
        const coins = Number(rec.coins ?? 0);
        return Number.isFinite(coins) ? sum + coins : sum;
      }, 0);

      const lastReportAt = (Array.isArray(reports) ? reports : []).reduce(
        (latest, row) => {
          const rec = row as WeeklyReportRow;
          const ms = toDateMs(rec.createdAt ?? rec.created_at ?? null);
          return ms && ms > latest ? ms : latest;
        },
        0
      );

      const filteredEntries = normalizedEntries.filter((row) => {
        if (!lastReportAt) return true;
        const rec = row as DailySaleEntryRow;
        const entryMs = toDateMs(rec.createdAt ?? rec.created_at ?? null);
        if (!entryMs) return true;
        return entryMs > lastReportAt;
      }) as DailySaleEntryRow[];

      let boxeo = 0;
      let agilidad = 0;
      for (const row of filteredEntries) {
        const coins = Number(row.coins ?? 0);
        if (!Number.isFinite(coins)) continue;
        const type = getEntryMachineType(row);
        if (type.includes("boxeo")) {
          boxeo += coins;
        } else if (type.includes("agilidad")) {
          agilidad += coins;
        }
      }
      operatorCoins.value = boxeo + agilidad;
      return;
    }

    const rows = (await getDailySales({
      startDate: date.value,
      endDate: date.value,
      machineId: String(props.machine.id),
    })) as DailySaleRow[];
    operatorCoins.value = rows.reduce(
      (sum, row) => sum + (Number(row?.coins) || 0),
      0
    );
    machineCoins.value = operatorCoins.value;
  } catch {
    operatorCoins.value = 0;
    machineCoins.value = 0;
    if (props.isOperator) {
      lostCount.value = 0;
      returnedCount.value = 0;
    }
  }
}

async function saveDaily() {
  if (!props.machine?.id) return;
  if (!date.value) {
    window.alert("Selecciona la fecha");
    return;
  }

  saving.value = true;
  try {
    const coinInput = clampCoins(coins.value);
    const currentCoins = props.isOperator
      ? machineCoins.value
      : operatorCoins.value;
    const nextCoins = currentCoins + coinInput;
    const recordValue = recordActive.value
      ? toRecordOrNull(recordDigits.value)
      : null;
    if (recordActive.value && recordValue === null) {
      saving.value = false;
      window.alert("Ingresa record (3-4 digitos)");
      return;
    }
    const noteValue = recordMessage.value.trim() || null;
    const saved = (await upsertDailySale({
      machineId: String(props.machine.id),
      date: date.value,
      coins: nextCoins,
      entryCoins: coinInput,
      prizeBs: recordValue,
      lost: toNonNegInt(isAgilidadMachine.value ? lostCount.value : 0),
      returned: toNonNegInt(
        isBoxeoMachine.value || isAgilidadMachine.value
          ? returnedCount.value
          : 0
      ),
      recordMessage: noteValue,
    })) as DailySaleRow;
    if (props.isOperator) {
      await loadOperatorCoins();
    } else {
      operatorCoins.value = saved?.coins ?? operatorCoins.value;
    }
    const lostValue = toNonNegInt(
      isAgilidadMachine.value ? lostCount.value : 0
    );
    const returnedValue = toNonNegInt(
      isBoxeoMachine.value || isAgilidadMachine.value ? returnedCount.value : 0
    );
    if (
      coinInput > 0 ||
      recordValue !== null ||
      noteValue ||
      lostValue > 0 ||
      returnedValue > 0
    ) {
      addLocalSaleEntry({
        machineId: String(props.machine.id),
        date: date.value,
        coins: coinInput,
        prizeBs: recordValue,
        lost: isAgilidadMachine.value ? lostValue : null,
        returned:
          isBoxeoMachine.value || isAgilidadMachine.value
            ? returnedValue
            : null,
        recordMessage: noteValue,
        createdAt: new Date().toISOString(),
        employeeUsername: localStorage.getItem("username") || undefined,
      });

      if (coinInput > 0) {
        window.dispatchEvent(
          new CustomEvent("operator-sale-logged", {
            detail: { coins: coinInput },
          })
        );
      }
    }
    resetTurnForm();
    justSaved.value = true;
    window.setTimeout(() => {
      justSaved.value = false;
    }, 1200);
    window.alert("Venta diaria guardada");
  } catch (e) {
    window.alert(apiErrorMessage(e));
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadOperatorCoins();
});

watch([() => props.machine.id, date], () => {
  void loadOperatorCoins();
});
</script>

<template>
  <article
    class="relative flex flex-col justify-between rounded-2xl border backdrop-blur-xl p-4 text-sm shadow-sm cursor-pointer"
    :class="
      dark
        ? 'bg-zinc-900/70 border-zinc-800/70 text-zinc-100'
        : 'bg-white/80 border-slate-200/80 text-slate-700'
    "
    role="link"
    tabindex="0"
    @click="handleSelect"
    @keydown.enter.prevent="handleSelect"
  >
    <header class="mb-3 flex items-start justify-between gap-2">
      <div class="min-w-0">
        <div class="flex items-center gap-2 min-w-0">
          <h2 class="min-w-0 truncate text-base font-semibold">
            {{ machine.name }}
          </h2>
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            :class="statusBadgeClass"
            aria-hidden="true"
            role="status"
            :aria-label="machineStatusLabel(machine.status)"
            :title="machineStatusLabel(machine.status)"
          >
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="machineStatusDotClass(machine.status)"
              aria-hidden="true"
            ></span>
          </span>
        </div>
        <p
          class="mt-0.5 text-xs"
          :class="dark ? 'text-zinc-300' : 'text-slate-500'"
        >
          {{ machine.location || "—" }}
        </p>
        <div v-if="machine && machine.test_mode" class="mt-1">
          <span
            class="inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-[11px] font-medium"
            :class="
              dark
                ? 'bg-emerald-900/60 text-emerald-100'
                : 'bg-emerald-50 text-emerald-700'
            "
          >
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Prueba
          </span>
        </div>
      </div>
      <button
        class="inline-flex h-8 w-8 shrink-0 flex-none items-center justify-center rounded-full border text-xs font-semibold shadow-sm cursor-pointer"
        :class="
          dark
            ? 'border-zinc-700/60 bg-zinc-950/20 text-zinc-100 hover:bg-zinc-950/30'
            : 'border-slate-200/70 bg-white/40 text-slate-600 hover:bg-white/60'
        "
        type="button"
        @click.stop.prevent="handleTopAction"
        :aria-label="isOperator ? 'Abrir historial' : 'Cambiar estado'"
        :title="isOperator ? 'Abrir historial' : 'Cambiar estado'"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M21 6.5l-4 4a5 5 0 0 1-6.5 6.5L3 21l4-7.5A5 5 0 0 1 13.5 7l4-4 3.5 3.5z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </header>

    <MachineStatusMenu
      v-if="!isOperator"
      :machine="machine"
      :is-open="isMenuOpen"
      :dark="dark"
      :is-admin="isAdmin"
      @toggle-maintenance="emit('toggle-maintenance', $event)"
      @toggle-test-mode="emit('toggle-test-mode', $event)"
      @close="emit('close-menu', $event)"
    />

    <div
      v-if="!isOperator"
      class="mt-3 grid items-end gap-x-4 gap-y-2 grid-cols-2 sm:grid-cols-4"
    >
      <div
        class="grid min-h-[42px] min-w-0 grid-rows-[auto_24px] content-end justify-items-center text-center"
      >
        <span
          class="text-[13px] sm:text-base font-semibold leading-none whitespace-nowrap"
          :class="dark ? 'text-zinc-50' : 'text-slate-900'"
        >
          $ {{ incomeToday }}
        </span>
        <span
          class="mt-1 h-[24px] w-full max-w-full px-0.5 text-[10px] uppercase tracking-wide leading-tight break-words"
          :class="dark ? 'text-zinc-500' : 'text-slate-400'"
        >
          Total Hoy
        </span>
      </div>
      <div
        class="grid min-h-[42px] min-w-0 grid-rows-[auto_24px] content-end justify-items-center text-center"
      >
        <span
          class="text-[13px] sm:text-base font-semibold leading-none whitespace-nowrap"
          :class="dark ? 'text-zinc-50' : 'text-slate-900'"
        >
          $ {{ incomeWeek }}
        </span>
        <span
          class="mt-1 h-[24px] w-full max-w-full px-0.5 text-[10px] uppercase tracking-wide leading-tight break-words"
          :class="dark ? 'text-zinc-500' : 'text-slate-400'"
        >
          Total Semanal
        </span>
      </div>
      <div
        class="grid min-h-[42px] min-w-0 grid-rows-[auto_24px] content-end justify-items-center text-center"
      >
        <span
          class="text-[13px] sm:text-base font-semibold leading-none whitespace-nowrap"
          :class="dark ? 'text-zinc-50' : 'text-slate-900'"
        >
          {{ dailyCoins }}
        </span>
        <span
          class="mt-1 h-[24px] w-full max-w-full px-0.5 text-[10px] uppercase tracking-wide leading-tight break-words"
          :class="dark ? 'text-zinc-500' : 'text-slate-400'"
        >
          Monedas hoy
        </span>
      </div>
      <div
        class="grid min-h-[42px] min-w-0 grid-rows-[auto_24px] content-end justify-items-center text-center"
      >
        <span
          class="text-[13px] sm:text-base font-semibold leading-none whitespace-nowrap"
          :class="dark ? 'text-zinc-50' : 'text-slate-900'"
        >
          {{ operatorCoins }}
        </span>
        <span
          class="mt-1 h-[24px] w-full max-w-full px-0.5 text-[10px] uppercase tracking-wide leading-tight break-words"
          :class="dark ? 'text-zinc-500' : 'text-slate-400'"
        >
          Monedas operador
        </span>
      </div>
    </div>

    <section
      v-if="isOperator"
      class="mt-3 rounded-xl border p-3 transition"
      :class="[
        dark
          ? 'border-zinc-800/70 bg-zinc-950/20'
          : 'border-slate-200 bg-white/60',
        justSaved ? 'ring-1 ring-emerald-400/60' : '',
      ]"
      @click="stopPropagation"
      @keydown="stopPropagation"
    >
      <div class="flex items-center justify-between gap-2">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em]">
            Venta de monedas
          </p>
          <p
            class="text-[10px]"
            :class="dark ? 'text-zinc-400' : 'text-slate-500'"
          >
            Calculadora de turno
          </p>
        </div>
      </div>

      <div class="mt-3 grid gap-3">
        <div class="grid items-center gap-3 grid-cols-[52px_1fr_72px]">
          <button
            type="button"
            class="h-12 w-12 rounded-xl border text-xl font-semibold transition"
            :class="
              dark
                ? 'border-zinc-700/70 bg-zinc-950/30 text-zinc-200 hover:bg-zinc-950/50'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            "
            @click="decrementCoins"
          >
            -
          </button>
          <div class="text-center">
            <div class="text-5xl font-semibold leading-none">
              {{ coins }}
            </div>
            <div
              class="mt-1 text-[10px] uppercase tracking-[0.3em]"
              :class="dark ? 'text-zinc-400' : 'text-slate-500'"
            >
              Monedas
            </div>
          </div>
          <button
            type="button"
            class="h-16 w-16 rounded-2xl border text-3xl font-semibold transition"
            :class="
              dark
                ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100/70'
            "
            @click="incrementCoins"
          >
            +
          </button>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            class="rounded-full border px-3 py-1 text-xs font-semibold transition"
            :class="
              dark
                ? 'border-zinc-700/70 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-950/60'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            "
            @click="addCoins(1)"
          >
            +1
          </button>
          <button
            type="button"
            class="rounded-full border px-3 py-1 text-xs font-semibold transition"
            :class="
              dark
                ? 'border-zinc-700/70 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-950/60'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            "
            @click="addCoins(2)"
          >
            +2
          </button>
          <button
            type="button"
            class="rounded-full border px-3 py-1 text-xs font-semibold transition"
            :class="
              dark
                ? 'border-zinc-700/70 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-950/60'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            "
            @click="addCoins(5)"
          >
            +5
          </button>
        </div>

        <div
          class="grid gap-2"
          :class="isAgilidadMachine ? 'grid-cols-3' : 'grid-cols-2'"
        >
          <div
            class="flex flex-col items-center justify-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold transition"
            :class="
              dark
                ? 'border-amber-400/40 bg-amber-500/15 text-amber-200'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            "
          >
            <span class="text-[10px] uppercase tracking-wide">↩️ Devuelta</span>
            <span class="text-lg font-semibold">{{ returnedCount }}</span>
            <div class="mt-1 flex items-center gap-2">
              <button
                type="button"
                class="h-7 w-7 rounded-full border text-sm font-semibold transition"
                :class="
                  dark
                    ? 'border-amber-300/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20'
                    : 'border-amber-200 bg-white text-amber-700 hover:bg-amber-100/70'
                "
                @click="decrementReturned"
              >
                -
              </button>
              <button
                type="button"
                class="h-7 w-7 rounded-full border text-sm font-semibold transition"
                :class="
                  dark
                    ? 'border-amber-300/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20'
                    : 'border-amber-200 bg-white text-amber-700 hover:bg-amber-100/70'
                "
                @pointerdown="startReturnPress"
                @pointerup="endReturnPress"
                @pointerleave="endReturnPress"
                @click="incrementReturned"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            class="flex flex-col items-center justify-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold transition"
            :class="
              recordActive
                ? dark
                  ? 'border-yellow-300/70 bg-yellow-400/25 text-yellow-100 shadow-[0_0_12px_rgba(250,204,21,0.35)]'
                  : 'border-yellow-300 bg-yellow-100 text-yellow-900'
                : dark
                ? 'border-zinc-700/70 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-950/60'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            "
            @click="toggleRecord"
          >
            <span class="text-[10px] uppercase tracking-wide">🏆 Record</span>
            <span class="text-lg font-semibold">
              {{ recordActive ? "ON" : "OFF" }}
            </span>
          </button>

          <div
            v-if="isAgilidadMachine"
            class="flex flex-col items-center justify-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold transition"
            :class="
              dark
                ? 'border-sky-400/40 bg-sky-500/15 text-sky-200'
                : 'border-sky-200 bg-sky-50 text-sky-800'
            "
          >
            <span class="text-[10px] uppercase tracking-wide">💨 Viento</span>
            <span class="text-lg font-semibold">{{ lostCount }}</span>
            <div class="mt-1 flex items-center gap-2">
              <button
                type="button"
                class="h-7 w-7 rounded-full border text-sm font-semibold transition"
                :class="
                  dark
                    ? 'border-sky-300/40 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20'
                    : 'border-sky-200 bg-white text-sky-700 hover:bg-sky-100/70'
                "
                @click="decrementLost"
              >
                -
              </button>
              <button
                type="button"
                class="h-7 w-7 rounded-full border text-sm font-semibold transition"
                :class="
                  dark
                    ? 'border-sky-300/40 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20'
                    : 'border-sky-200 bg-white text-sky-700 hover:bg-sky-100/70'
                "
                @click="incrementLost"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="recordActive"
          class="rounded-xl border p-3"
          :class="
            dark
              ? 'border-zinc-800/70 bg-zinc-950/20'
              : 'border-slate-200 bg-white/70'
          "
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold">Record (3-4 digitos)</span>
            <button
              type="button"
              class="rounded-md border px-2 py-1 text-[10px] font-semibold transition"
              :class="
                dark
                  ? 'border-zinc-700/70 bg-zinc-950/30 text-zinc-200 hover:bg-zinc-950/50'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              "
              @click="clearRecordDigits"
            >
              Borrar
            </button>
          </div>
          <label class="mt-3 grid gap-1">
            <input
              :value="recordDigits"
              type="text"
              inputmode="numeric"
              maxlength="4"
              class="h-11 w-full rounded-lg border px-3 text-center text-xl font-semibold tracking-[0.4em] outline-none"
              :class="
                dark
                  ? 'border-zinc-700/70 bg-zinc-950/30 text-zinc-100 placeholder:text-zinc-600'
                  : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400'
              "
              placeholder="----"
              @input="handleRecordInput"
            />
          </label>
        </div>

        <label class="grid gap-1">
          <span
            class="text-[10px] uppercase tracking-[0.25em]"
            :class="dark ? 'text-zinc-400' : 'text-slate-500'"
          >
            Incidente
          </span>
          <input
            v-model="recordMessage"
            type="text"
            class="h-10 w-full rounded-lg border px-3 text-xs font-semibold outline-none"
            :class="
              dark
                ? 'border-zinc-700/70 bg-zinc-950/30 text-zinc-100 placeholder:text-zinc-600'
                : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400'
            "
            placeholder="Escribe el incidente..."
          />
        </label>

        <button
          type="button"
          class="h-12 w-full rounded-xl text-sm font-semibold uppercase tracking-wide transition"
          :class="
            dark
              ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400'
              : 'bg-emerald-600 text-white hover:bg-emerald-500'
          "
          :disabled="saving"
          @click="saveDaily"
        >
          {{ saving ? "Guardando…" : `Registrar turnos (${coins})` }}
        </button>
      </div>
    </section>

    <div
      v-if="!isOperator"
      class="mt-2 space-y-1 text-[11px]"
      :class="dark ? 'text-zinc-400' : 'text-slate-400'"
    >
      <p class="flex flex-wrap gap-x-1">
        <span
          class="font-medium"
          :class="dark ? 'text-zinc-300' : 'text-slate-500'"
        >
          Primer inicio:
        </span>
        <span class="break-words">
          {{ formatCaracasDateTime(firstOnToday || machine.last_on) }}
        </span>
      </p>
      <p class="flex flex-wrap gap-x-1">
        <span
          class="font-medium"
          :class="dark ? 'text-zinc-300' : 'text-slate-500'"
        >
          Ultimo cierre:
        </span>
        <span class="break-words">
          {{ formatCaracasDateTime(machine.last_off) }}
        </span>
      </p>
    </div>
  </article>
</template>
