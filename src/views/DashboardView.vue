<script setup lang="ts">
import { inject, type Ref } from "vue";

const injectedDark = inject<Ref<boolean> | boolean>("darkMode", false);

const isDark = () => {
  if (typeof injectedDark === "boolean") return injectedDark;
  return !!injectedDark?.value;
};
</script>

<template>
  <div :class="['px-2 py-4 sm:p-6', isDark() ? 'bg-slate-900' : 'bg-white']">
    <h1 class="text-3xl font-bold mb-4">Panel general</h1>
    <p
      class="text-sm mb-6"
      :class="isDark() ? 'text-slate-300' : 'text-slate-600'"
    >
      Resumen de estado de todas las máquinas y métricas principales.
    </p>
    <div class="grid gap-4 grid-cols-1 md:grid-cols-3">
      <div
        class="rounded-xl border p-4 transition-colors"
        :class="
          isDark()
            ? 'bg-slate-800 border-slate-700 shadow-none'
            : 'bg-red-50 border-red-100'
        "
      >
        <h2
          class="text-sm font-semibold mb-2"
          :class="isDark() ? 'text-slate-200' : 'text-slate-700'"
        >
          Máquinas activas
        </h2>
        <p
          class="text-3xl font-bold"
          :class="isDark() ? 'text-white' : 'text-slate-900'"
        >
          12
        </p>
      </div>

      <div
        class="rounded-xl border p-4 shadow-sm transition-colors"
        :class="
          isDark()
            ? 'bg-slate-800 border-slate-700'
            : 'bg-red-50 border-red-100'
        "
      >
        <h2
          class="text-sm font-semibold mb-2"
          :class="isDark() ? 'text-slate-200' : 'text-slate-700'"
        >
          Alertas
        </h2>
        <p
          class="text-3xl font-bold"
          :class="isDark() ? 'text-amber-300' : 'text-amber-600'"
        >
          3
        </p>
      </div>

      <div
        class="rounded-xl border p-4 shadow-sm transition-colors"
        :class="
          isDark()
            ? 'bg-slate-800 border-slate-700'
            : 'bg-red-50 border-red-100'
        "
      >
        <h2
          class="text-sm font-semibold mb-2"
          :class="isDark() ? 'text-slate-200' : 'text-slate-700'"
        >
          Paradas hoy
        </h2>
        <p
          class="text-3xl font-bold"
          :class="isDark() ? 'text-red-300' : 'text-red-600'"
        >
          1
        </p>
      </div>
    </div>
  </div>
</template>
