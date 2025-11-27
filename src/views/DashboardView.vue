<script setup lang="ts">
import { inject, type Ref } from "vue";

const injectedDark = inject<Ref<boolean> | boolean>("darkMode", false);

const isDark = () => {
  if (typeof injectedDark === "boolean") return injectedDark;
  return !!injectedDark?.value;
};
</script>

<template>
  <div
    :class="[
      'min-h-full px-3 py-4 sm:px-8 sm:py-6 space-y-6',
      isDark() ? 'bg-slate-900' : 'bg-slate-50',
    ]"
  >
    <!-- Header principal -->
    <header
      class="flex flex-col gap-4 rounded-2xl border bg-white px-4 py-4 shadow-sm sm:px-8 sm:py-5"
      :class="
        isDark()
          ? 'bg-slate-900/60 border-slate-800 text-white'
          : 'bg-white border-slate-200 text-slate-900'
      "
    >
      <div class="flex items-start justify-between gap-4">
        <div class="space-y-1">
          <h1 class="text-xl font-semibold sm:text-2xl">MachineHub</h1>
          <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
            Panel de control
          </p>
          <p
            class="text-sm"
            :class="isDark() ? 'text-slate-300' : 'text-slate-500'"
          >
            Bienvenido, <span class="font-medium">prueba</span>.
          </p>
        </div>
        <button
          class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition sm:text-sm"
          :class="
            isDark()
              ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          "
        >
          <span class="hidden sm:inline">Salir</span>
          <span class="sm:hidden">⤴</span>
        </button>
      </div>

      <!-- Tarjetas métricas superiores -->
      <div class="grid gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-4">
        <div
          class="rounded-2xl border px-4 py-3 text-sm shadow-sm"
          :class="
            isDark()
              ? 'border-slate-800 bg-slate-900/60 text-slate-100'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          "
        >
          <p
            class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
          >
            Total de máquinas
          </p>
          <p class="text-2xl font-semibold">6</p>
        </div>

        <div
          class="rounded-2xl border px-4 py-3 text-sm shadow-sm"
          :class="
            isDark()
              ? 'border-red-900/60 bg-red-950/40 text-red-200'
              : 'border-red-100 bg-red-50 text-red-700'
          "
        >
          <p
            class="mb-1 text-xs font-medium uppercase tracking-wide text-red-400"
          >
            Activas hoy
          </p>
          <p class="text-2xl font-semibold">4</p>
        </div>

        <div
          class="rounded-2xl border px-4 py-3 text-sm shadow-sm"
          :class="
            isDark()
              ? 'border-red-900/60 bg-red-950/40 text-red-200'
              : 'border-red-100 bg-red-50 text-red-700'
          "
        >
          <p
            class="mb-1 text-xs font-medium uppercase tracking-wide text-red-400"
          >
            Ingresos hoy
          </p>
          <p class="text-2xl font-semibold text-red-600">$ 1440</p>
        </div>

        <div
          class="rounded-2xl border px-4 py-3 text-sm shadow-sm"
          :class="
            isDark()
              ? 'border-slate-800 bg-slate-950/40 text-slate-200'
              : 'border-slate-200 bg-white text-slate-700'
          "
        >
          <p
            class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
          >
            Puntaje hoy
          </p>
          <p class="text-2xl font-semibold text-slate-900">9150</p>
        </div>
      </div>
    </header>

    <!-- Barra de búsqueda y acciones -->
    <section class="space-y-4">
      <div
        class="flex flex-col gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6"
        :class="
          isDark()
            ? 'bg-slate-900/60 border-slate-800'
            : 'bg-white border-slate-200'
        "
      >
        <div
          class="flex flex-1 items-center gap-3 rounded-full border px-3 py-2 text-sm"
          :class="
            isDark()
              ? 'border-slate-700 bg-slate-900/80 text-slate-200'
              : 'border-slate-200 bg-slate-50 text-slate-500'
          "
        >
          <span class="text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="Buscar máquina u ubicación..."
            class="w-full bg-transparent text-xs outline-none placeholder:text-slate-400 sm:text-sm"
          />
        </div>

        <div class="flex items-center gap-2 self-end sm:self-auto">
          <button
            class="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 sm:text-sm"
            :class="
              isDark()
                ? 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800'
                : 'border-slate-200 bg-white text-slate-700'
            "
          >
            <span>⚙</span>
            <span class="hidden sm:inline">Filtro</span>
          </button>
          <button
            class="inline-flex items-center gap-1 rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-red-700 sm:text-sm"
          >
            <span>＋</span>
            <span class="hidden sm:inline">Nueva</span>
          </button>
        </div>
      </div>

      <!-- Filtros de estado -->
      <div class="flex flex-wrap gap-2 text-xs sm:text-sm">
        <button
          class="rounded-full px-4 py-1.5 font-medium shadow-sm"
          :class="
            isDark()
              ? 'bg-slate-100 text-slate-900'
              : 'bg-slate-900 text-slate-50'
          "
        >
          Todas
        </button>
        <button
          class="rounded-full border px-4 py-1.5 font-medium text-slate-500"
          :class="
            isDark()
              ? 'border-slate-700 bg-slate-900/60'
              : 'border-slate-200 bg-white'
          "
        >
          Activas
        </button>
        <button
          class="rounded-full border px-4 py-1.5 font-medium text-slate-500"
          :class="
            isDark()
              ? 'border-slate-700 bg-slate-900/60'
              : 'border-slate-200 bg-white'
          "
        >
          Inactivas
        </button>
        <button
          class="rounded-full border px-4 py-1.5 font-medium text-slate-500"
          :class="
            isDark()
              ? 'border-slate-700 bg-slate-900/60'
              : 'border-slate-200 bg-white'
          "
        >
          Mantenimiento
        </button>
      </div>
    </section>

    <!-- Grid de tarjetas de máquinas -->
    <section
      class="grid gap-4 pb-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3"
    >
      <!-- Tarjeta ejemplo - puedes duplicar y cambiar datos -->
      <article
        class="flex flex-col justify-between rounded-2xl border bg-white p-4 text-sm shadow-sm"
        :class="
          isDark()
            ? 'bg-slate-900/70 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-700'
        "
      >
        <header class="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 class="text-sm font-semibold">Máquina Premium 01</h2>
            <p class="text-xs text-slate-400">Centro comercial - Pasillo A</p>
          </div>
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold text-red-600 shadow-sm"
            :class="
              isDark()
                ? 'border-red-500/40 bg-red-900/40 text-red-100'
                : 'border-red-100 bg-red-50'
            "
          >
            ⏻
          </button>
        </header>

        <div class="mb-3">
          <span
            class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            :class="
              isDark() ? 'bg-red-900/60 text-red-100' : 'bg-red-50 text-red-700'
            "
          >
            Activa
          </span>
        </div>

        <div
          class="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl border px-3 py-2 text-xs"
          :class="
            isDark()
              ? 'border-slate-800 bg-slate-900/40'
              : 'border-slate-200 bg-slate-50'
          "
        >
          <p class="font-medium text-slate-400">Ingresos hoy</p>
          <p
            class="text-right font-semibold text-slate-800"
            :class="isDark() ? 'text-slate-100' : ''"
          >
            $ 350
          </p>
          <p class="font-medium text-slate-400">Puntaje hoy</p>
          <p
            class="text-right font-semibold text-slate-800"
            :class="isDark() ? 'text-slate-100' : ''"
          >
            2350
          </p>
          <p class="font-medium text-slate-400">Total ingresos</p>
          <p
            class="text-right text-slate-800"
            :class="isDark() ? 'text-slate-100' : ''"
          >
            $ 2450
          </p>
          <p class="font-medium text-slate-400">Tiempo activo</p>
          <p
            class="text-right text-slate-800"
            :class="isDark() ? 'text-slate-100' : ''"
          >
            42 h
          </p>
        </div>

        <div class="mb-3 space-y-1 text-[11px] text-slate-400">
          <p>Último inicio: Hoy 09:30 AM</p>
          <p>Último cierre: Hoy 08:45 PM</p>
        </div>

        <div class="mt-1 flex justify-end">
          <button
            class="inline-flex w-full items-center justify-between rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white shadow-sm sm:w-auto sm:px-5"
            :class="isDark() ? 'hover:bg-red-500' : 'hover:bg-red-700'"
          >
            <span>Ver detalles</span>
            <span>➜</span>
          </button>
        </div>
      </article>
    </section>
  </div>
</template>
