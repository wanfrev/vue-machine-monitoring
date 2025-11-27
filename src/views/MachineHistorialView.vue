<script setup lang="ts">
import { computed, ref } from "vue";

type Tx = {
  kind: "Ingreso" | "Evento";
  description: string;
  date: string;
  time?: string;
  amount: number;
  ok: boolean;
};

/* prettier-ignore */
const txs = ref<Tx[]>([
  { kind: "Ingreso", description: "Ingreso - Sesión #127", date: "2025-11-27", time: "19:57", amount: 129, ok: true },
  { kind: "Ingreso", description: "Evento - Error de comunicación", date: "2025-11-27", time: "11:19", amount: 68, ok: true },
  { kind: "Ingreso", description: "Venta", date: "2025-11-27", time: "11:17", amount: 120, ok: true },
  { kind: "Ingreso", description: "Venta", date: "2025-11-26", time: "22:57", amount: 130, ok: true },
  { kind: "Ingreso", description: "Venta", date: "2025-11-26", time: "20:51", amount: 102, ok: true },
  { kind: "Ingreso", description: "Venta", date: "2025-11-26", time: "18:52", amount: 168, ok: true },
  { kind: "Ingreso", description: "Venta", date: "2025-11-26", time: "13:57", amount: 132, ok: true },
  { kind: "Ingreso", description: "Venta", date: "2025-11-26", time: "08:38", amount: 168, ok: true },
  { kind: "Ingreso", description: "Venta", date: "2025-11-25", time: "16:45", amount: 115, ok: true },
  { kind: "Ingreso", description: "Venta", date: "2025-11-25", time: "12:03", amount: 124, ok: true },
  { kind: "Ingreso", description: "Venta", date: "2025-11-25", time: "08:33", amount: 149, ok: true },
  { kind: "Evento", description: "Evento", date: "2025-11-25", time: "05:36", amount: 0, ok: false },
  { kind: "Ingreso", description: "Venta", date: "2025-11-25", time: "02:57", amount: 114, ok: true },
  { kind: "Ingreso", description: "Venta", date: "2025-11-25", time: "00:56", amount: 104, ok: true },
  { kind: "Ingreso", description: "Venta", date: "2025-11-24", time: "22:24", amount: 0, ok: true },
  { kind: "Ingreso", description: "Venta", date: "2025-11-24", time: "21:11", amount: 43, ok: true },
  { kind: "Ingreso", description: "Venta", date: "2025-11-24", time: "08:46", amount: 31, ok: true },
  { kind: "Ingreso", description: "Venta", date: "2025-11-23", time: "18:07", amount: 75, ok: true },
  { kind: "Evento", description: "Evento", date: "2025-11-23", time: "17:56", amount: 0, ok: false },
  { kind: "Ingreso", description: "Venta", date: "2025-11-23", time: "15:11", amount: 84, ok: true },
]);

const search = ref("");
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
const visible = computed(() => filtered.value.slice(0, 20));
const totalIncome = computed(() =>
  filtered.value.reduce(
    (sum, t) => sum + (t.kind === "Ingreso" ? t.amount : 0),
    0
  )
);

function scoreFor(t: Tx) {
  return t.kind === "Ingreso" ? Math.round(t.amount * 5.1) : 0;
}
</script>

<template>
  <section class="space-y-4">
    <div
      class="rounded-2xl border bg-white p-4 shadow-sm sm:p-6 border-slate-200"
    >
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-semibold">
          Historial detallado de transacciones
        </h2>
        <button
          class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer border-slate-200"
        >
          <span>📅</span>
          <span>27 oct - 26 nov</span>
        </button>
      </div>
      <div
        class="mb-4 flex items-center gap-2 rounded-full border px-3 py-2 text-sm border-slate-200 bg-slate-50 text-slate-500"
      >
        <span>🔎</span>
        <input
          v-model="search"
          type="text"
          placeholder="Buscar en historial..."
          class="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      <!-- Mobile cards (show up to lg) -->
      <div class="lg:hidden space-y-3">
        <div
          v-for="(t, i) in visible"
          :key="i"
          class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div class="mb-2 flex items-center justify-between">
            <span
              class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="
                t.kind === 'Ingreso'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              "
            >
              {{ t.kind }}
            </span>
            <span
              class="inline-flex h-6 w-6 items-center justify-center rounded-full border"
              :class="
                t.ok
                  ? 'border-green-200 bg-green-50 text-green-600'
                  : 'border-slate-200 bg-slate-50 text-slate-400'
              "
            >
              ✓
            </span>
          </div>
          <h3 class="text-base font-semibold text-slate-800">
            {{ t.description }}
          </h3>
          <p class="text-xs text-slate-400">{{ t.date }} {{ t.time }}</p>
          <div
            class="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
          >
            <div>
              <p class="text-xs text-slate-500">Monto</p>
              <p
                class="text-2xl font-semibold"
                :class="
                  t.kind === 'Ingreso' ? 'text-slate-900' : 'text-slate-400'
                "
              >
                {{ t.kind === "Ingreso" ? `$ ${t.amount}` : "$ 0" }}
              </p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Puntaje</p>
              <p class="text-2xl font-semibold text-slate-900">
                {{ scoreFor(t) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop table (lg and up) -->
      <div
        class="hidden overflow-hidden rounded-xl border border-slate-200 lg:block"
      >
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-500">
            <tr>
              <th class="px-4 py-2 text-left">Tipo</th>
              <th class="px-4 py-2 text-left">Descripción</th>
              <th class="px-4 py-2 text-left">Fecha</th>
              <th class="px-4 py-2 text-left">Monto</th>
              <th class="px-4 py-2 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(t, i) in visible"
              :key="i"
              class="border-t border-slate-100"
            >
              <td class="px-4 py-2">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="
                    t.kind === 'Ingreso'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  "
                  >{{ t.kind }}</span
                >
              </td>
              <td class="px-4 py-2 text-slate-600">{{ t.description }}</td>
              <td class="px-4 py-2 text-slate-500">
                <div>{{ t.date }}</div>
                <div class="text-xs">{{ t.time }}</div>
              </td>
              <td
                class="px-4 py-2 font-semibold"
                :class="
                  t.kind === 'Ingreso' ? 'text-slate-800' : 'text-slate-400'
                "
              >
                {{ t.kind === "Ingreso" ? `$ ${t.amount}` : "$ 0" }}
              </td>
              <td class="px-4 py-2">
                <span
                  class="inline-flex h-5 w-5 items-center justify-center rounded-full border"
                  :class="
                    t.ok
                      ? 'border-green-200 bg-green-50 text-green-600'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  "
                  >✓</span
                >
              </td>
            </tr>
            <tr v-if="visible.length === 0">
              <td colspan="5" class="px-4 py-6 text-center text-slate-400">
                No se encontraron resultados
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <div
          class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
        >
          <p class="text-slate-400">Registros mostrados</p>
          <p class="text-slate-800">
            <span class="font-semibold">{{ visible.length }}</span> /
            {{ filtered.length }}
          </p>
        </div>
        <div
          class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
        >
          <p class="text-slate-400">Total ingresos</p>
          <p class="text-red-600 font-semibold">$ {{ totalIncome }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped></style>
