<template>
  <div
    v-if="open"
    class="absolute z-40 mt-2 right-0 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl p-5 flex flex-col gap-4"
    @click.stop
  >
    <div class="flex items-center gap-2 mb-2">
      <svg
        class="w-5 h-5 text-violet-600"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M3 4.6C3 4.03995 3 3.75992 3.10899 3.54601C3.20487 3.35785 3.35785 3.20487 3.54601 3.10899C3.75992 3 4.03995 3 4.6 3H19.4C19.9601 3 20.2401 3 20.454 3.10899C20.6422 3.20487 20.7951 3.35785 20.891 3.54601C21 3.75992 21 4.03995 21 4.6V6.33726C21 6.58185 21 6.70414 20.9724 6.81923C20.9479 6.92127 20.9075 7.01881 20.8526 7.10828C20.7908 7.2092 20.7043 7.29568 20.5314 7.46863L14.4686 13.5314C14.2957 13.7043 14.2092 13.7908 14.1474 13.8917C14.0925 13.9812 14.0521 14.0787 14.0276 14.1808C14 14.2959 14 14.4182 14 14.6627V17L10 21V14.6627C10 14.4182 10 14.2959 9.97237 14.1808C9.94787 14.0787 9.90747 13.9812 9.85264 13.8917C9.7908 13.7908 9.70432 13.7043 9.53137 13.5314L3.46863 7.46863C3.29568 7.29568 3.2092 7.2092 3.14736 7.10828C3.09253 7.01881 3.05213 6.92127 3.02763 6.81923C3 6.70414 3 6.58185 3 6.33726V4.6Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
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
