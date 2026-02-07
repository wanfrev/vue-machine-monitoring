<script setup lang="ts">
/* global defineProps, defineEmits */
import { computed, onMounted, ref, watch } from "vue";
import MachineStatusMenu from "@/components/MachineStatusMenu.vue";
import { useCoinValues } from "@/composables/useCoinValues";
import { getDailySales, upsertDailySale } from "@/api/client";
import {
  getIncomeFromCoins,
  machineStatusDotClass,
  machineStatusLabel,
} from "@/utils/machine";
import { formatCaracasDateTime, getTodayLocalStr } from "@/utils/date";
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

const date = ref<string>(getTodayLocalStr());
const coinOptions = Array.from({ length: 51 }, (_, i) => i);
const coins = ref<number | null>(null);
const recordDigits = ref<string>("");
const recordMessage = ref<string>("");
const saving = ref(false);
const operatorCoins = ref<number>(0);

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
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0 || n > 9999) return null;
  return n;
}

function onRecordInput(event: Event) {
  const target = event.target as HTMLInputElement | null;
  if (!target) return;
  const cleaned = target.value.replace(/\D/g, "").slice(0, 4);
  recordDigits.value = cleaned;
}

function pickMySale(rows: DailySaleRow[]): DailySaleRow | null {
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

async function loadOperatorCoins() {
  if (!props.isOperator) return;
  if (!props.machine?.id || !date.value) {
    operatorCoins.value = 0;
    return;
  }

  try {
    const rows = (await getDailySales({
      startDate: date.value,
      endDate: date.value,
      machineId: String(props.machine.id),
    })) as DailySaleRow[];
    const mine = pickMySale(rows);
    operatorCoins.value = mine?.coins ?? 0;
  } catch {
    operatorCoins.value = 0;
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
    const coinInput = toNonNegInt(coins.value);
    const nextCoins = operatorCoins.value + coinInput;
    const saved = (await upsertDailySale({
      machineId: String(props.machine.id),
      date: date.value,
      coins: nextCoins,
      prizeBs: toRecordOrNull(recordDigits.value),
      recordMessage: recordMessage.value.trim() || null,
    })) as DailySaleRow;
    operatorCoins.value = saved?.coins ?? operatorCoins.value;
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
    @click="emit('select', machine)"
    @keydown.enter.prevent="emit('select', machine)"
  >
    <header class="mb-3 flex items-start justify-between gap-2">
      <div class="min-w-0">
        <div class="flex items-center gap-2 min-w-0">
          <span
            class="h-2.5 w-2.5 rounded-full"
            :class="machineStatusDotClass(machine.status)"
            aria-hidden="true"
            role="status"
            :aria-label="machineStatusLabel(machine.status)"
            :title="machineStatusLabel(machine.status)"
          ></span>
          <h2 class="min-w-0 truncate text-base font-semibold">
            {{ machine.name }}
          </h2>
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
        @click.stop.prevent="emit('toggle-menu', machine.id)"
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
            d="M12 2v10"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M7.05 6.05a7 7 0 1 0 9.9 0"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </header>

    <MachineStatusMenu
      :machine="machine"
      :is-open="isMenuOpen"
      :dark="dark"
      :is-admin="isAdmin"
      @toggle-maintenance="emit('toggle-maintenance', $event)"
      @toggle-test-mode="emit('toggle-test-mode', $event)"
      @close="emit('close-menu', $event)"
    />

    <div
      class="mt-3 grid items-end gap-x-4 gap-y-2"
      :class="!isOperator ? 'grid-cols-3' : 'grid-cols-1'"
    >
      <template v-if="!isOperator">
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
      </template>
      <template v-else>
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
      </template>
    </div>

    <section
      v-if="isOperator"
      class="mt-3 rounded-xl border p-3"
      :class="
        dark
          ? 'border-zinc-800/70 bg-zinc-950/20'
          : 'border-slate-200 bg-white/60'
      "
      @click.stop
      @keydown.stop
    >
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-xs font-semibold">Registrar venta</h3>
      </div>

      <div class="mt-2 grid gap-2">
        <label class="grid min-w-0 gap-1">
          <span
            class="text-[11px]"
            :class="dark ? 'text-zinc-400' : 'text-slate-500'"
            >Monedas</span
          >
          <select
            v-model.number="coins"
            class="block h-9 w-full min-w-0 rounded-lg border px-2 text-xs outline-none"
            :class="
              dark
                ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            "
          >
            <option :value="null" disabled>Selecciona…</option>
            <option v-for="value in coinOptions" :key="value" :value="value">
              {{ value }}
            </option>
          </select>
        </label>

        <label class="grid min-w-0 gap-1">
          <span
            class="text-[11px]"
            :class="dark ? 'text-zinc-400' : 'text-slate-500'"
            >Record (4 digitos)</span
          >
          <input
            :value="recordDigits"
            type="text"
            inputmode="numeric"
            pattern="\d*"
            maxlength="4"
            class="block h-9 w-full min-w-0 rounded-lg border px-2 text-xs outline-none"
            :class="
              dark
                ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            "
            placeholder="0000"
            @input="onRecordInput"
          />
        </label>

        <label class="grid min-w-0 gap-1">
          <span
            class="text-[11px]"
            :class="dark ? 'text-zinc-400' : 'text-slate-500'"
            >Nota</span
          >
          <input
            v-model="recordMessage"
            type="text"
            class="block h-9 w-full min-w-0 rounded-lg border px-2 text-xs outline-none"
            :class="
              dark
                ? 'bg-zinc-950/30 border-zinc-700/60 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            "
            placeholder="Ej: cambio de operador, incidencia, etc."
          />
        </label>
      </div>

      <div class="mt-3 flex items-center justify-end">
        <button
          type="button"
          class="h-9 rounded-lg border px-3 text-xs font-semibold transition cursor-pointer"
          :class="
            dark
              ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/25'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100/60'
          "
          :disabled="saving"
          @click="saveDaily"
        >
          {{ saving ? "Guardando…" : "Guardar" }}
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
