<template>
  <div
    v-if="open"
    class="absolute z-40 mt-2 right-0 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl p-5 flex flex-col gap-4"
    @click.stop
  >
    <div class="flex items-center gap-2 mb-2">
      <span class="text-violet-600 text-xl">&#x1F50D;</span>
      <span class="font-semibold text-lg text-slate-700">Filtros</span>
    </div>
    <div class="border-b mb-2"></div>
    <!-- Ubicación -->
    <div>
      <button
        class="w-full flex justify-between items-center font-semibold text-slate-700 mb-2"
      >
        Ubicación
        <span>&#9660;</span>
      </button>
      <div class="flex flex-col gap-1 pl-2">
        <label
          v-for="loc in locations"
          :key="loc"
          class="flex items-center gap-2 text-slate-600"
        >
          <input type="checkbox" v-model="selectedLocations" :value="loc" />
          {{ loc }}
        </label>
      </div>
    </div>
    <!-- Rango de ingresos -->
    <div>
      <button
        class="w-full flex justify-between items-center font-semibold text-slate-700 mb-2"
      >
        Rango de ingresos
        <span>&#9660;</span>
      </button>
      <div class="pl-2">
        <div class="flex justify-between text-xs text-slate-500 mb-1">
          <span>Mínimo: ${{ minIncome }}</span>
          <span>Máximo: ${{ maxIncome }}</span>
        </div>
        <input
          type="range"
          min="0"
          max="10000"
          v-model="income"
          class="w-full accent-red-600"
        />
      </div>
    </div>
    <!-- Tasa de uso -->
    <div>
      <button
        class="w-full flex justify-between items-center font-semibold text-slate-700 mb-2"
      >
        Tasa de uso
        <span>&#9660;</span>
      </button>
      <div class="pl-2">
        <div class="flex justify-between text-xs text-slate-500 mb-1">
          <span>Mínimo: 0%</span>
          <span>Máximo: 100%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          v-model="usage"
          class="w-full accent-red-600"
        />
      </div>
    </div>
    <!-- Fecha de mantenimiento -->
    <div>
      <button
        class="w-full flex justify-between items-center font-semibold text-slate-700 mb-2"
      >
        Fecha de mantenimiento
        <span>&#9660;</span>
      </button>
      <div class="pl-2">
        <label class="text-xs text-slate-500 mb-1">Desde:</label>
        <input
          type="date"
          v-model="maintenanceDate"
          class="w-full rounded-lg border px-2 py-1 mt-1"
        />
      </div>
    </div>
    <button
      class="w-full rounded-xl bg-red-600 text-white font-semibold py-2 mt-2 shadow transition hover:bg-red-700"
      @click="$emit('apply')"
    >
      Aplicar
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from "vue";
const props = defineProps<{ open: boolean }>();
const emit = defineEmits(["close", "apply"]);
const locations = [
  "Centro comercial - Pasillo A",
  "Centro comercial - Pasillo B",
  "Centro comercial - Entrada",
  "Centro comercial - Pasillo C",
  "Sucursal norte",
  "Sucursal sur",
];
const selectedLocations = ref<string[]>([]);
const minIncome = 0;
const maxIncome = 10000;
const income = ref(0);
const usage = ref(0);
const maintenanceDate = ref("");
</script>
