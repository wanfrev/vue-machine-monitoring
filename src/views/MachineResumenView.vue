<script setup lang="ts"></script>

<template>
  <!-- Resumen content: chart + metrics grid -->
  <section
    class="rounded-2xl border bg-white p-4 shadow-sm sm:p-6 border-slate-200"
  >
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-sm font-semibold">$ Ingresos por día – Último mes</h2>
      <button
        class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer border-slate-200"
      >
        <span>📅</span>
        <span>27 oct - 26 nov</span>
      </button>
    </div>
    <div
      class="h-64 w-full rounded-xl border border-dashed border-slate-300"
    ></div>
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
        Total ingresos
      </p>
      <p class="text-3xl font-semibold text-red-600">$ 9102</p>
    </div>
    <div
      class="rounded-2xl border bg-white px-4 py-3 shadow-sm border-slate-200"
    >
      <p
        class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
      >
        Total puntaje
      </p>
      <p class="text-3xl font-semibold text-red-600">95428</p>
    </div>
    <div
      class="rounded-2xl border bg-white px-4 py-3 shadow-sm border-slate-200"
    >
      <p
        class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
      >
        Sesiones activas
      </p>
      <p class="text-3xl font-semibold text-green-600">60</p>
    </div>
    <div
      class="rounded-2xl border bg-white px-4 py-3 shadow-sm border-slate-200"
    >
      <p
        class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
      >
        Tasa de uso
      </p>
      <p class="text-3xl font-semibold text-red-600">41.1 %</p>
    </div>
  </section>
</template>

<style scoped></style>
