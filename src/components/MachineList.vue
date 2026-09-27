<script setup lang="ts">
/* global defineProps, defineEmits */
import { computed, onMounted, onUnmounted, ref } from "vue";
import { startVisiblePolling } from "@/utils/visiblePolling";
import { getDailySales } from "@/api/client";
import { useCoinValues } from "@/composables/useCoinValues";
import {
  getIncomeFromCoins,
  machineStatusDotClassAdmin,
  machineStatusLabel,
} from "@/utils/machine";
import {
  formatTimeShort,
  getTodayLocalStr,
  getWeekStartLocalStr,
} from "@/utils/date";
import type { Machine } from "@/types/machine";

const props = defineProps<{
  machines: Machine[];
  dailyCoinsByMachine: Record<string, number>;
  weeklyCoinsByMachine: Record<string, number>;
  firstOnTodayByMachine: Record<string, string>;
  isAdmin: boolean;
  dark: boolean;
}>();

const emit = defineEmits<{
  (e: "select", machine: Machine): void;
  (e: "edit", machine: Machine): void;
  (e: "toggle-maintenance", machine: Machine): void;
  (e: "toggle-test-mode", machine: Machine): void;
  (e: "delete", machine: Machine): void;
}>();

const { coinValues } = useCoinValues();
const registeredByMachine = ref<Record<string, number>>({});
const registeredWeekByMachine = ref<Record<string, number>>({});
const menuOpenId = ref<string | null>(null);
let stopPolling: (() => void) | undefined;

function income(coins: number, m: Machine): number {
  coinValues.value;
  return Math.round(getIncomeFromCoins(coins, m.name, m.type) * 100) / 100;
}

const rows = computed(() =>
  props.machines.map((m) => {
    const detected = props.dailyCoinsByMachine[m.id] || 0;
    const registered = registeredByMachine.value[m.id] || 0;
    const week = registeredWeekByMachine.value[m.id] || 0;
    return {
      machine: m,
      detected,
      registered,
      diff: detected - registered,
      today: income(registered, m),
      week: income(week, m),
    };
  })
);

function stateLine(m: Machine): string {
  if (m.status === "maintenance") return "Mantenimiento";
  if (m.status === "active") {
    const since = formatTimeShort(
      props.firstOnTodayByMachine[m.id] || m.last_on
    );
    return since ? `Encendida ${since}` : "Encendida";
  }
  const off = formatTimeShort(m.last_off);
  return off ? `Apagada ${off}` : "Apagada";
}

async function loadRegistered() {
  const today = getTodayLocalStr();
  try {
    const data = await getDailySales({
      startDate: getWeekStartLocalStr(),
      endDate: today,
    });
    const todayMap: Record<string, number> = {};
    const weekMap: Record<string, number> = {};
    for (const r of Array.isArray(data) ? data : []) {
      const id = String(r?.machineId ?? "");
      if (!id) continue;
      const coins = Number(r?.coins) || 0;
      weekMap[id] = (weekMap[id] || 0) + coins;
      if (String(r?.date ?? "").slice(0, 10) === today) {
        todayMap[id] = (todayMap[id] || 0) + coins;
      }
    }
    registeredByMachine.value = todayMap;
    registeredWeekByMachine.value = weekMap;
  } catch {
    registeredByMachine.value = {};
    registeredWeekByMachine.value = {};
  }
}

function closeMenu(e: MouseEvent) {
  const t = e.target as HTMLElement | null;
  if (!t?.closest("[data-row-menu]")) menuOpenId.value = null;
}

function toggleMenu(id: string) {
  menuOpenId.value = menuOpenId.value === id ? null : id;
}

function act(fn: () => void) {
  menuOpenId.value = null;
  fn();
}

onMounted(() => {
  void loadRegistered();
  stopPolling = startVisiblePolling(() => loadRegistered(), 30000);
  window.addEventListener("click", closeMenu, true);
});

onUnmounted(() => {
  stopPolling?.();
  window.removeEventListener("click", closeMenu, true);
});
</script>

<template>
  <section
    class="rounded-2xl border shadow-sm"
    :class="
      dark
        ? 'border-zinc-800/70 bg-zinc-900/70 text-zinc-100'
        : 'border-slate-200/70 bg-white/60 text-slate-900'
    "
    aria-label="Listado de máquinas"
  >
    <p
      v-if="rows.length === 0"
      class="px-4 py-6 text-sm"
      :class="dark ? 'text-zinc-400' : 'text-slate-500'"
    >
      No hay máquinas que coincidan.
    </p>

    <ul
      class="divide-y"
      :class="dark ? 'divide-zinc-800/70' : 'divide-slate-200/70'"
    >
      <li
        v-for="row in rows"
        :key="row.machine.id"
        class="relative flex items-center gap-2 pr-2"
      >
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
          @click="emit('select', row.machine)"
        >
          <span
            class="h-2.5 w-2.5 shrink-0 rounded-full"
            :class="machineStatusDotClassAdmin(row.machine.status)"
            :title="machineStatusLabel(row.machine.status)"
          ></span>

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold sm:text-base">
              {{ row.machine.name }}
              <span
                v-if="row.machine.test_mode"
                class="ml-1 rounded bg-zinc-500/15 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400"
                >PRUEBA</span
              >
            </p>
            <p
              class="truncate text-xs font-medium"
              :class="
                row.machine.status === 'active'
                  ? dark
                    ? 'text-emerald-400'
                    : 'text-emerald-600'
                  : row.machine.status === 'maintenance'
                  ? dark
                    ? 'text-orange-300'
                    : 'text-orange-600'
                  : dark
                  ? 'text-zinc-400'
                  : 'text-zinc-500'
              "
            >
              {{ stateLine(row.machine) }}
            </p>
            <p
              class="truncate text-xs"
              :class="dark ? 'text-zinc-400' : 'text-slate-500'"
            >
              {{ row.machine.location || "Sin ubicación" }}
            </p>
          </div>

          <div class="hidden text-right sm:block">
            <p class="text-sm font-medium">$ {{ row.week }}</p>
            <p
              class="text-[11px]"
              :class="dark ? 'text-zinc-500' : 'text-slate-400'"
            >
              semana
            </p>
          </div>

          <div class="text-right">
            <p class="text-base font-semibold">$ {{ row.today }}</p>
            <p class="mt-1 flex flex-wrap items-center justify-end gap-1">
              <span
                class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                :class="
                  dark
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-amber-50 text-amber-700'
                "
              >
                Operadora {{ row.registered }}
              </span>
              <span
                class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                :class="
                  dark
                    ? 'bg-zinc-500/15 text-zinc-300'
                    : 'bg-zinc-100 text-zinc-600'
                "
              >
                Máquina {{ row.detected }}
              </span>
            </p>
          </div>

          <span
            aria-hidden="true"
            :class="dark ? 'text-zinc-500' : 'text-slate-400'"
            >›</span
          >
        </button>

        <div v-if="isAdmin" class="relative" data-row-menu>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none"
            :class="
              dark
                ? 'text-zinc-400 hover:bg-zinc-800'
                : 'text-slate-500 hover:bg-slate-100'
            "
            aria-label="Opciones de la máquina"
            @click.stop="toggleMenu(row.machine.id)"
          >
            ⋯
          </button>
          <div
            v-if="menuOpenId === row.machine.id"
            class="absolute right-0 top-9 z-20 w-52 rounded-xl border py-1 text-sm shadow-lg"
            :class="
              dark
                ? 'border-zinc-800 bg-zinc-950 text-zinc-100'
                : 'border-slate-200 bg-white text-slate-700'
            "
          >
            <button
              type="button"
              class="block w-full px-3 py-2 text-left hover:bg-slate-500/10"
              @click="act(() => emit('edit', row.machine))"
            >
              Editar nombre y ubicación
            </button>
            <button
              type="button"
              class="block w-full px-3 py-2 text-left hover:bg-slate-500/10"
              @click="act(() => emit('toggle-maintenance', row.machine))"
            >
              {{
                row.machine.status === "maintenance"
                  ? "Quitar mantenimiento"
                  : "Poner en mantenimiento"
              }}
            </button>
            <button
              type="button"
              class="block w-full px-3 py-2 text-left hover:bg-slate-500/10"
              @click="act(() => emit('toggle-test-mode', row.machine))"
            >
              {{
                row.machine.test_mode
                  ? "Salir del modo prueba"
                  : "Activar modo prueba"
              }}
            </button>
            <button
              type="button"
              class="block w-full px-3 py-2 text-left text-rose-500 hover:bg-rose-500/10"
              @click="act(() => emit('delete', row.machine))"
            >
              Eliminar máquina…
            </button>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>
