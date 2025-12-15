<script setup lang="ts">
import { computed, onMounted, ref, watch, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { getMachines, getMachineDailyIncome } from "../api/client";
import BarChart from "../components/BarChart.vue";

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
// Monedas de HOY para la máquina seleccionada
const totalCoins = ref(0);

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const today = new Date();
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(today.getDate() - 30);

const startDate = ref(formatDate(thirtyDaysAgo));
const endDate = ref(formatDate(today));

const dailyIncome = ref<{ date: string; income: number }[]>([]);

const valuePerCoin = computed(() => {
  const name = machine.value?.name ?? "";
  return name.includes("Boxeo") ? 1 : 2;
});

const totalIncome = computed(() => totalCoins.value * valuePerCoin.value);
const isOn = computed(() => machine.value?.status === "active");

function getDateRangeArray(start: string, end: string) {
  const arr: string[] = [];
  let current = new Date(start);
  const last = new Date(end);
  while (current <= last) {
    arr.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return arr;
}

function toLocalDateString(utcDateString: string) {
  // Convierte una fecha UTC (YYYY-MM-DD o ISO) a YYYY-MM-DD local
  if (!utcDateString) return "";
  const d = new Date(utcDateString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function loadDailyIncome() {
  if (!machine.value) return;
  try {
    const data = await getMachineDailyIncome(machine.value.id, {
      startDate: startDate.value,
      endDate: endDate.value,
    });
    // Convertir fechas UTC a local antes de agrupar
    const mapped = (data || []).map((d: any) => ({
      date: d.date ? toLocalDateString(d.date) : "",
      income: Number(d.income) * valuePerCoin.value,
    }));
    const allDates = getDateRangeArray(startDate.value, endDate.value);
    dailyIncome.value = allDates.map((date) => {
      const found = mapped.find((m) => m.date === date);
      return { date, income: found ? found.income : 0 };
    });
  } catch (e) {
    console.error("Error cargando ingresos diarios de la máquina:", e);
    dailyIncome.value = [];
  }
}

let refreshInterval: number | undefined;

async function fetchAllData() {
  loading.value = true;
  try {
    const all = await getMachines();
    const routeId = route.params.id as string | undefined;
    const current = all.find(
      (m: any) => m.name === routeId || m.id === routeId
    );
    if (current) {
      machine.value = current;
      // Monedas de HOY usando getMachineDailyIncome con rango de un solo día (fecha local)
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const todayLocalStr = `${year}-${month}-${day}`;
      const todayData = await getMachineDailyIncome(current.id, {
        startDate: todayLocalStr,
        endDate: todayLocalStr,
      });
      let coinsToday = 0;
      if (Array.isArray(todayData) && todayData.length) {
        const found = todayData.find((d) => {
          if (!d.date) return false;
          const dDate = new Date(d.date);
          const dYear = dDate.getFullYear();
          const dMonth = String(dDate.getMonth() + 1).padStart(2, "0");
          const dDay = String(dDate.getDate()).padStart(2, "0");
          return `${dYear}-${dMonth}-${dDay}` === todayLocalStr;
        });
        coinsToday = found ? Number(found.income ?? 0) : 0;
      }
      totalCoins.value = coinsToday;
      await loadDailyIncome();
    }
  } catch (e) {
    console.error("Error cargando resumen de máquina:", e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchAllData();
  refreshInterval = window.setInterval(fetchAllData, 10000); // 10 segundos
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
});

watch([startDate, endDate, machine], async () => {
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
      class="h-64 w-full rounded-xl border border-dashed border-slate-300 px-2 py-4 bg-slate-50 flex items-center justify-center"
    >
      <BarChart
        v-if="dailyIncome.length"
        :chartData="{
          labels: dailyIncome.map((d) => d.date),
          datasets: [
            {
              label: 'Ingresos',
              backgroundColor: '#1e293b',
              data: dailyIncome.map((d) => d.income),
              borderRadius: 6,
              maxBarThickness: 16,
              categoryPercentage: 0.9,
              barPercentage: 0.9,
            },
          ],
        }"
        :chartOptions="{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: { enabled: true },
          },
          scales: {
            x: {
              title: { display: true, text: 'Fecha' },
              ticks: {
                color: '#64748b',
                font: { size: 10 },
                autoSkip: true,
                maxTicksLimit: 10,
              },
              grid: { display: false },
            },
            y: {
              title: { display: true, text: 'Ingresos ($)' },
              beginAtZero: true,
              ticks: { color: '#64748b', font: { size: 10 }, precision: 0 },
              grid: { color: '#e2e8f0' },
            },
          },
        }"
        class="w-full h-full"
      />
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
        Monedas hoy
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
        Ingresos hoy
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
