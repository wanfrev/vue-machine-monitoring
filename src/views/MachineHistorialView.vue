<script setup lang="ts">
import { computed, onMounted, ref, watch, onUnmounted } from "vue";
import { getSocket } from "../api/realtime";
import { useRoute, useRouter } from "vue-router";
import { getMachines, getMachineHistory } from "../api/client";
import { useCurrentUser } from "@/composables/useCurrentUser";
import { useDateRangeStorage } from "@/composables/useDateRangeStorage";
import { useTheme } from "@/composables/useTheme";
import { useCoinValues } from "@/composables/useCoinValues";
import { filterMachinesForRole } from "@/utils/access";
import { getCoinValueForMachine } from "@/utils/machine";

type Tx = {
  kind: "Ingreso" | "Evento";
  description: string;
  date: string;
  time?: string;
  amount: number;
  coins: number;
  ok: boolean;
};

const txs = ref<Tx[]>([]);

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;

type Machine = {
  id: string;
  name: string;
  status: string;
  location?: string;
  type?: string;
};

const route = useRoute();
const router = useRouter();

// Rol actual para controlar visibilidad de dinero
const { currentRole, isOperator, assignedMachineIds } = useCurrentUser();

// Rango de fechas para el historial (por defecto desde inicio de mes hasta hoy)
function formatDate(d: Date) {
  // Fecha local YYYY-MM-DD (sin convertir a UTC)
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = new Date();
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const startDate = ref(formatDate(startOfMonth));
const endDate = ref(formatDate(today));

function defaultDateRangeForNow() {
  const now = new Date();
  const startObj = new Date(now.getFullYear(), now.getMonth(), 1);
  const endObj = now;
  return { start: formatDate(startObj), end: formatDate(endObj) };
}

const hasActiveDateFilter = computed(() => {
  const def = defaultDateRangeForNow();
  return startDate.value !== def.start || endDate.value !== def.end;
});

function resetDateRange() {
  const def = defaultDateRangeForNow();
  startDate.value = def.start;
  endDate.value = def.end;
  currentPage.value = 1;
  clearStoredRange();
}

const rangeStorageKey = computed(() => {
  const id = String(route.params.id ?? "");
  return `mm:range:machine-historial:${id}`;
});

const { readStoredRange, writeStoredRange, clearStoredRange } =
  useDateRangeStorage({
    storageKey: rangeStorageKey,
    startDate,
    endDate,
    isActive: () => hasActiveDateFilter.value,
  });

readStoredRange();

const search = ref("");

const pageSize = 20;
const currentPage = ref(1);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return txs.value;
  return txs.value.filter((t) =>
    [t.kind, t.description, t.date, t.time ?? "", String(t.amount)]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
});

const totalPages = computed(() => {
  if (!filtered.value.length) return 1;
  return Math.ceil(filtered.value.length / pageSize);
});

const visible = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filtered.value.slice(start, start + pageSize);
});
const machine = ref<Machine | null>(null);
// Total de monedas para el rango seleccionado
const totalCoins = ref(0);

const { coinValues } = useCoinValues();

const valuePerCoin = computed(() => {
  // Track coinValues so UI updates when admin changes values.
  coinValues.value;
  const m = machine.value;
  return getCoinValueForMachine(m?.name || "", m?.type);
});

const totalIncome = computed(() => totalCoins.value * valuePerCoin.value);

watch([valuePerCoin, isOperator], () => {
  // Recompute amounts locally without refetching.
  txs.value = txs.value.map((t) => {
    if (t.kind !== "Ingreso") return t;
    const amount = isOperator.value ? t.coins : t.coins * valuePerCoin.value;
    return { ...t, amount };
  });
});

function toLocalDateTime(utcString: string) {
  if (!utcString) return { date: "", time: "" };
  const d = new Date(utcString);
  // Force display in America/Caracas to ensure consistent day boundaries
  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Caracas",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const date = dateFmt.format(d); // en-CA -> YYYY-MM-DD
  const time = timeFmt.format(d);
  return { date, time };
}

async function loadHistory() {
  if (!machine.value) return;
  try {
    const history = await getMachineHistory(machine.value.id, {
      startDate: startDate.value,
      endDate: endDate.value,
    });
    // Solo mapear eventos de monedas (coin_inserted)
    // Pero excluir monedas marcadas como prueba (`data.test === true`) o
    // cuando la máquina está actualmente en `test_mode`.
    let sumCoins = 0;
    const mapped = (history || [])
      .filter((h: any) => {
        if (h.type !== "coin_inserted") return false;
        try {
          if (h.data && h.data.test === true) return false;
        } catch (e) {
          /* ignore */
        }
        return true;
      })
      .map((h: any) => {
        const coins = Number(h.data?.cantidad ?? h.data?.amount ?? 1);
        const amount = isOperator.value ? coins : coins * valuePerCoin.value;
        const { date, time } = toLocalDateTime(h.timestamp);
        return {
          kind: "Ingreso",
          description: "Ingreso de moneda",
          date,
          time,
          amount,
          coins,
          ok: true,
        } as Tx;
      })
      // Filtro extra por rango de fechas usando la fecha LOCAL del evento
      .filter((t: Tx) => {
        const d = t.date;
        if (!d) return false;
        if (startDate.value && d < startDate.value) return false;
        if (endDate.value && d > endDate.value) return false;
        sumCoins += Number.isFinite(t.coins) ? t.coins : 0;
        return true;
      });
    txs.value = mapped;
    totalCoins.value = sumCoins;
  } catch (e) {
    console.error("Error cargando historial de máquina:", e);
    txs.value = [];
    totalCoins.value = 0;
  }
}

let refreshInterval: number | undefined;
let socket: any = null;

async function fetchAllData() {
  try {
    const all = (await getMachines()) as any[];
    const allowed = filterMachinesForRole(
      all.map((m) => ({
        ...m,
        id: String(m.id),
        status: String(m.status || "inactive"),
      })),
      { role: currentRole.value, assignedMachineIds: assignedMachineIds.value }
    );
    const routeId = route.params.id as string | undefined;
    const current = allowed.find(
      (m: any) => m.name === routeId || String(m.id) === String(routeId)
    );
    if (!current) {
      machine.value = null;
      txs.value = [];
      totalCoins.value = 0;
      router.replace({ name: "dashboard" });
      return;
    }

    machine.value = current;
    await loadHistory();
  } catch (e) {
    console.error("Error cargando datos de historial de máquina:", e);
  }
}

onMounted(() => {
  fetchAllData();
  refreshInterval = window.setInterval(fetchAllData, 10000); // 10 segundos
  // Subscribe to realtime coin events so the history updates immediately
  try {
    socket = getSocket();
    socket.on("coin_inserted", (p: any) => {
      if (!machine.value) return;
      if (p.machineId !== machine.value.id) return;
      if (p.test) return; // ignore test-mode coins
      const coins = Number(p.amount ?? 1) || 1;
      const { date, time } = toLocalDateTime(
        p.timestamp || new Date().toISOString()
      );
      const amount = isOperator.value ? coins : coins * valuePerCoin.value;
      const tx: Tx = {
        kind: "Ingreso",
        description: "Ingreso de moneda",
        date,
        time,
        amount,
        coins,
        ok: true,
      };
      // Prepend to the list so newest appear first
      txs.value.unshift(tx);
      totalCoins.value = totalCoins.value + coins;
    });
  } catch (e) {
    console.error("Error subscribing to coin_inserted socket:", e);
  }
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
  try {
    if (socket) socket.off("coin_inserted");
  } catch (err) {
    console.error("Error unsubscribing coin_inserted socket:", err);
  }
});

function scoreFor(t: Tx) {
  return t.kind === "Ingreso" ? Math.round(t.amount * 5.1) : 0;
}

watch([startDate, endDate, machine], async () => {
  if (!machine.value) return;
  if (startDate.value && endDate.value && startDate.value > endDate.value) {
    return;
  }
  currentPage.value = 1;
  writeStoredRange();
  await loadHistory();
});

watch(search, () => {
  currentPage.value = 1;
});
</script>

<template>
  <section class="space-y-4">
    <div
      class="rounded-2xl border backdrop-blur-xl p-4 shadow-sm sm:p-6"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-zinc-100'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div
        class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <h2 class="text-sm font-semibold">Historial detallado de monedas</h2>
        <div
          class="w-full sm:w-auto flex flex-wrap items-center gap-2 rounded-full border px-3 py-2 text-xs sm:text-sm backdrop-blur"
          :class="
            isDark()
              ? 'border-zinc-800/70 bg-zinc-950/20 text-zinc-200'
              : 'border-slate-200/70 bg-white/50 text-slate-600'
          "
        >
          <input
            v-model="startDate"
            type="date"
            class="min-w-0 flex-1 rounded-md border backdrop-blur px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400/40 focus:border-zinc-500 dark:border-zinc-700/60 dark:bg-zinc-950/20 dark:text-zinc-100 dark:[color-scheme:dark]"
            :class="
              isDark()
                ? 'border-zinc-700/60 bg-zinc-950/20 text-zinc-100'
                : 'border-slate-200/70 bg-white/40 text-slate-700'
            "
          />
          <span class="text-slate-400">a</span>
          <input
            v-model="endDate"
            type="date"
            class="min-w-0 flex-1 rounded-md border backdrop-blur px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400/40 focus:border-zinc-500 dark:border-zinc-700/60 dark:bg-zinc-950/20 dark:text-zinc-100 dark:[color-scheme:dark]"
            :class="
              isDark()
                ? 'border-zinc-700/60 bg-zinc-950/20 text-zinc-100'
                : 'border-slate-200/70 bg-white/40 text-slate-700'
            "
          />

          <button
            v-if="hasActiveDateFilter"
            type="button"
            class="rounded-md border px-2 py-1 text-xs font-medium"
            :class="
              isDark()
                ? 'border-zinc-700/60 bg-zinc-950/20 text-zinc-200 hover:bg-zinc-100/10'
                : 'border-slate-200/70 bg-white/50 text-slate-700 hover:bg-white/70'
            "
            @click="resetDateRange"
          >
            Borrar filtro
          </button>
        </div>
      </div>
      <div
        class="mb-6 flex items-center gap-2 rounded-full border px-3 py-2 text-sm backdrop-blur"
        :class="
          isDark()
            ? 'border-zinc-800/70 bg-zinc-950/20 text-zinc-200'
            : 'border-slate-200/70 bg-white/50 text-slate-600'
        "
      >
        <span class="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="6" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          v-model="search"
          type="text"
          placeholder="Buscar en historial..."
          class="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      <!-- Lista móvil simplificada (hasta lg) -->
      <div class="lg:hidden">
        <div
          v-if="visible.length === 0"
          class="rounded-2xl border border-dashed backdrop-blur p-4 text-center text-sm"
          :class="
            isDark()
              ? 'border-zinc-800/70 bg-zinc-900/40 text-zinc-300'
              : 'border-slate-200/70 bg-white/40 text-slate-500'
          "
        >
          No hay registros en el historial para este rango de fechas.
        </div>
        <div
          v-else
          class="border-t divide-y"
          :class="
            isDark()
              ? 'border-zinc-800/70 divide-zinc-800/70'
              : 'border-slate-100 divide-slate-100'
          "
        >
          <div
            v-for="(t, i) in visible"
            :key="i"
            class="flex items-center justify-between py-3"
          >
            <p
              class="text-xs"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              {{ t.date }} {{ t.time }}
            </p>
            <p
              class="text-base font-semibold text-right whitespace-nowrap"
              :class="
                t.kind === 'Ingreso'
                  ? isDark()
                    ? 'text-slate-100'
                    : 'text-slate-900'
                  : 'text-slate-400'
              "
            >
              {{
                t.kind === "Ingreso"
                  ? isOperator
                    ? `${t.amount} monedas`
                    : "$ " + String(t.amount)
                  : isOperator
                  ? "0 monedas"
                  : "$ 0"
              }}
            </p>
          </div>
        </div>
      </div>

      <!-- Tabla de escritorio simplificada (lg y arriba) -->
      <div
        class="hidden overflow-hidden rounded-xl border backdrop-blur-xl lg:block"
        :class="
          isDark()
            ? 'border-zinc-800/70 bg-zinc-900/60'
            : 'border-slate-200/70 bg-white/50'
        "
      >
        <table class="w-full text-sm">
          <thead
            class="backdrop-blur"
            :class="
              isDark()
                ? 'bg-slate-900/70 text-slate-200'
                : 'bg-slate-50/80 text-slate-700'
            "
          >
            <tr>
              <th class="px-4 py-2 text-left">Fecha</th>
              <th class="px-4 py-2 text-right">Monto</th>
            </tr>
          </thead>
          <tbody v-if="visible.length > 0">
            <tr
              v-for="(t, i) in visible"
              :key="i"
              class="border-t transition-colors"
              :class="
                isDark()
                  ? 'border-zinc-800/70 hover:bg-zinc-100/5'
                  : 'border-slate-100 hover:bg-slate-50/70'
              "
            >
              <td
                class="px-4 py-2"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                <div>{{ t.date }} {{ t.time }}</div>
              </td>
              <td
                class="px-4 py-2 font-semibold text-right"
                :class="
                  t.kind === 'Ingreso'
                    ? isDark()
                      ? 'text-zinc-100'
                      : 'text-slate-800'
                    : 'text-slate-400'
                "
              >
                {{
                  t.kind === "Ingreso"
                    ? isOperator
                      ? `${t.amount} monedas`
                      : "$ " + String(t.amount)
                    : isOperator
                    ? "0 monedas"
                    : "$ 0"
                }}
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr>
              <td colspan="2" class="px-4 py-6 text-center text-slate-400">
                No hay registros en el historial para este rango de fechas.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3">
        <div
          class="rounded-xl border backdrop-blur px-4 py-3 text-sm"
          :class="
            isDark()
              ? 'border-zinc-800/70 bg-zinc-900/60'
              : 'border-slate-200/70 bg-white/50'
          "
        >
          <p class="text-slate-400">Registros mostrados</p>
          <p :class="isDark() ? 'text-zinc-100' : 'text-slate-800'">
            <span class="font-semibold">{{ visible.length }}</span> /
            {{ filtered.length }}
          </p>
        </div>
        <div
          class="rounded-xl border backdrop-blur px-4 py-3 text-sm"
          :class="
            isDark()
              ? 'border-zinc-800/70 bg-zinc-900/60'
              : 'border-slate-200/70 bg-white/50'
          "
        >
          <p class="text-slate-400">
            {{
              isOperator ? "Monedas (reales)" : "Monedas / ingresos (reales)"
            }}
          </p>
          <p class="text-red-600 font-semibold">
            {{ totalCoins }} monedas
            <span v-if="!isOperator"> · $ {{ totalIncome }}</span>
          </p>
        </div>
      </div>

      <div
        class="mt-3 flex items-center justify-center gap-2 text-xs sm:text-sm"
        v-if="filtered.length > 0"
        :class="isDark() ? 'text-zinc-300' : 'text-slate-600'"
      >
        <button
          class="rounded-lg border px-3 py-1.5 backdrop-blur disabled:opacity-40 disabled:cursor-not-allowed"
          :class="
            isDark()
              ? 'border-zinc-700/60 bg-zinc-950/20 text-zinc-200 hover:bg-zinc-100/10'
              : 'border-slate-200/70 bg-white/50 text-slate-600 hover:bg-white/70'
          "
          :disabled="currentPage === 1"
          @click="currentPage = currentPage - 1"
        >
          Anterior
        </button>
        <span>
          Página
          <span class="font-semibold">{{ currentPage }}</span>
          de
          <span class="font-semibold">{{ totalPages }}</span>
        </span>
        <button
          class="rounded-lg border px-3 py-1.5 backdrop-blur disabled:opacity-40 disabled:cursor-not-allowed"
          :class="
            isDark()
              ? 'border-zinc-700/60 bg-zinc-950/20 text-zinc-200 hover:bg-zinc-100/10'
              : 'border-slate-200/70 bg-white/50 text-slate-600 hover:bg-white/70'
          "
          :disabled="currentPage === totalPages"
          @click="currentPage = currentPage + 1"
        >
          Siguiente
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped></style>
