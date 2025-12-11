<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  getMachines,
  getCoinsByMachine,
  getMachineDailyIncome,
} from "../api/client";

type Machine = {
  id: string;
  name: string;
  status: string;
  location?: string;
  type?: string;
};

const route = useRoute();

const loading = ref(false);
const machine = ref<Machine | null>(null);
const totalCoins = ref(0);

// Rango de fechas para la gráfica (por defecto últimos 30 días)
function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const today = new Date();
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(today.getDate() - 30);

const startDate = ref(formatDate(thirtyDaysAgo));
const endDate = ref(formatDate(today));

// Datos para la gráfica de barras de ingresos diarios
const dailyIncome = ref<{ date: string; income: number }[]>([]);

const valuePerCoin = computed(() => {
  const name = machine.value?.name ?? "";
  return name.includes("Boxeo") ? 1 : 2;
});

const totalIncome = computed(() => totalCoins.value * valuePerCoin.value);

const isOn = computed(() => machine.value?.status === "active");

const maxDailyIncome = computed(() => {
  if (!dailyIncome.value.length) return 0;
  return Math.max(...dailyIncome.value.map((d) => d.income));
});

async function loadDailyIncome() {
  if (!machine.value) return;
  try {
    const data = await getMachineDailyIncome(machine.value.id, {
      startDate: startDate.value,
      endDate: endDate.value,
    });
    dailyIncome.value = data;
  } catch (e) {
    console.error("Error cargando ingresos diarios de la máquina:", e);
    dailyIncome.value = [];
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    const all = await getMachines();
    const routeId = route.params.id as string | undefined;
    const current = all.find(
      (m: any) => m.name === routeId || m.id === routeId
    );
    if (current) {
      machine.value = current;
      const coinsPerMachine = await getCoinsByMachine();
      const row = coinsPerMachine.find((r) => r.machine_id === current.id);
      totalCoins.value = Number(row?.total_coins ?? 0);
      await loadDailyIncome();
    }
  } catch (e) {
    console.error("Error cargando resumen de máquina:", e);
  } finally {
    loading.value = false;
  }
});

watch([startDate, endDate, machine], async () => {
  // Validar que startDate <= endDate antes de recargar
  if (!machine.value) return;
  if (startDate.value && endDate.value && startDate.value > endDate.value) {
    return;
  }
  await loadDailyIncome();
});
</script>

<template>
  <!-- Resumen content: chart + metrics grid -->
  <section
    class="rounded-2xl border bg-white p-4 shadow-sm sm:p-6 border-slate-200"
  >
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-sm font-semibold">$ Ingresos por día – Último mes</h2>
      <div
        class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 bg-white border-slate-200"
      >
        <span class="hidden sm:inline">Rango:</span>
        <input
          v-model="startDate"
          type="date"
          class="rounded-md border border-slate-200 px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        <span class="text-slate-400">a</span>
        <input
          v-model="endDate"
          type="date"
          class="rounded-md border border-slate-200 px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>
    </div>
    <div
      class="h-64 w-full rounded-xl border border-dashed border-slate-300 flex items-end gap-1 px-2 py-4 overflow-x-auto bg-slate-50"
    >
      <template v-if="dailyIncome.length && maxDailyIncome > 0">
        <div
          v-for="point in dailyIncome"
          :key="point.date"
          class="flex flex-col items-center gap-1"
        >
          <div
            class="w-4 rounded-t-md bg-slate-900"
            :style="{
              height:
                Math.max((point.income / maxDailyIncome) * 100, 4).toString() +
                '%',
            }"
            :title="`${point.date}: $ ${point.income}`"
          ></div>
          <span class="text-[10px] text-slate-400">
            {{ point.date.slice(5) }}
          </span>
        </div>
      </template>
      <p v-else class="mx-auto text-xs text-slate-400 text-center">
        No hay datos de ingresos para el rango seleccionado.
      </p>
    </div>
    <div class="mt-4 text-sm text-slate-600">
      <span class="inline-block h-3 w-3 rounded-sm bg-slate-900"></span>
      <span class="ml-2">Ingresos</span>
    </div>
  </section>

  <section class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <div
      class="rounded-2xl border bg-white px-4 py-3 shadow-sm border-slate-200"
    >
      <p
        class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
      >
        Estado actual
      </p>
      <p
        class="text-3xl font-semibold"
        :class="isOn ? 'text-green-600' : 'text-slate-500'"
      >
        {{ isOn ? "Encendida" : "Apagada" }}
      </p>
    </div>
    <div
      class="rounded-2xl border bg-white px-4 py-3 shadow-sm border-slate-200"
    >
      <p
        class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
      >
        Monedas totales
      </p>
      <p class="text-3xl font-semibold text-red-600">
        {{ totalCoins }}
      </p>
    </div>
    <div
      class="rounded-2xl border bg-white px-4 py-3 shadow-sm border-slate-200"
    >
      <p
        class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
      >
        Total ingresos
      </p>
      <p class="text-3xl font-semibold text-red-600">$ {{ totalIncome }}</p>
    </div>
    <div
      class="rounded-2xl border bg-white px-4 py-3 shadow-sm border-slate-200"
    >
      <p
        class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
      >
        Valor por moneda
      </p>
      <p class="text-3xl font-semibold text-slate-900">$ {{ valuePerCoin }}</p>
    </div>
  </section>
</template>

<style scoped></style>
