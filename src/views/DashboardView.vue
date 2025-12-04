<script setup lang="ts">
import { inject, type Ref, ref } from "vue";
import AppSidebar from "@/components/AppSidebar.vue";
import NewMachine from "@/components/NewMachine.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import { getMachines, createMachine as apiCreateMachine } from "../api/client";

const sidebarOpen = ref(false);
const newMachineOpen = ref(false);
const filterOpen = ref(false);

const machines = ref([]);

const injectedDark = inject<Ref<boolean> | boolean>("darkMode", false);
const isDark = () => {
  if (typeof injectedDark === "boolean") return injectedDark;
  return !!injectedDark?.value;
};

async function handleNewMachine(machine: {
  name: string;
  location: string;
  id?: string;
}) {
  await apiCreateMachine(machine);
  machines.value = await getMachines();
}
// Cargar máquinas al montar
import { onMounted } from "vue";
onMounted(async () => {
  machines.value = await getMachines();
});
</script>

<template>
  <AppSidebar
    :open="sidebarOpen"
    :dark="isDark()"
    @close="sidebarOpen = false"
    @open="filterOpen = false"
  />
  <NewMachine
    :open="newMachineOpen"
    :count="machines.length"
    :dark="isDark()"
    @close="newMachineOpen = false"
    @create="handleNewMachine"
  />
  <!-- ...existing code... -->
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
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg border text-slate-500 transition cursor-pointer"
              :class="
                isDark()
                  ? 'border-red-300 bg-red-700 hover:bg-red-600 hover:text-white'
                  : 'border-red-200 bg-red-100 hover:bg-red-200 hover:text-red-700'
              "
              aria-label="Abrir menú lateral"
              @click="
                sidebarOpen = true;
                filterOpen = false;
              "
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 512 512"
                fill="none"
              >
                <path
                  d="M315.27,33,96,304H224L192.49,477.23a2.36,2.36,0,0,0,2.33,2.77h0a2.36,2.36,0,0,0,1.89-.95L416,208H288L319.66,34.75A2.45,2.45,0,0,0,317.22,32h0A2.42,2.42,0,0,0,315.27,33Z"
                  :stroke="isDark() ? '#ffffff' : '#000000'"
                  stroke-width="28"
                />
              </svg>
            </button>
            <h1 class="text-xl font-semibold sm:text-2xl">MachineHub</h1>
          </div>
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
        <!-- Botón salir movido a Sidebar -->
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
          <div class="relative">
            <button
              class="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 sm:text-sm cursor-pointer"
              :class="
                isDark()
                  ? 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800'
                  : 'border-slate-200 bg-white text-slate-700'
              "
              @click="
                filterOpen = !filterOpen;
                if (filterOpen) sidebarOpen = false;
              "
            >
              <span>⚙</span>
              <span class="hidden sm:inline">Filtro</span>
            </button>
            <FilterPanel
              :open="filterOpen"
              @close="filterOpen = false"
              @apply="filterOpen = false"
            />
          </div>
          <button
            class="inline-flex items-center gap-1 rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-red-700 sm:text-sm cursor-pointer"
            @click="newMachineOpen = true"
          >
            <span>＋</span>
            <span class="hidden sm:inline">Nueva</span>
          </button>
        </div>
      </div>

      <!-- Filtros de estado -->
      <div class="flex flex-wrap gap-2 text-xs sm:text-sm">
        <button
          class="rounded-full px-4 py-1.5 font-medium shadow-sm cursor-pointer"
          :class="
            isDark()
              ? 'bg-slate-100 text-slate-900'
              : 'bg-slate-900 text-slate-50'
          "
        >
          Todas
        </button>
        <button
          class="rounded-full border px-4 py-1.5 font-medium text-slate-500 cursor-pointer"
          :class="
            isDark()
              ? 'border-slate-700 bg-slate-900/60'
              : 'border-slate-200 bg-white'
          "
        >
          Activas
        </button>
        <button
          class="rounded-full border px-4 py-1.5 font-medium text-slate-500 cursor-pointer"
          :class="
            isDark()
              ? 'border-slate-700 bg-slate-900/60'
              : 'border-slate-200 bg-white'
          "
        >
          Inactivas
        </button>
        <button
          class="rounded-full border px-4 py-1.5 font-medium text-slate-500 cursor-pointer"
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
      <article
        v-for="machine in machines"
        :key="machine.name"
        class="flex flex-col justify-between rounded-2xl border bg-white p-4 text-sm shadow-sm"
        :class="
          isDark()
            ? 'bg-slate-900/70 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-700'
        "
      >
        <header class="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 class="text-sm font-semibold">{{ machine.name }}</h2>
            <p class="text-xs text-slate-400">{{ machine.location }}</p>
          </div>
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold text-red-600 shadow-sm cursor-pointer"
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
            >Activa</span
          >
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
            $ 0
          </p>
          <p class="font-medium text-slate-400">Puntaje hoy</p>
          <p
            class="text-right font-semibold text-slate-800"
            :class="isDark() ? 'text-slate-100' : ''"
          >
            0
          </p>
          <p class="font-medium text-slate-400">Total ingresos</p>
          <p
            class="text-right text-slate-800"
            :class="isDark() ? 'text-slate-100' : ''"
          >
            $ 0
          </p>
          <p class="font-medium text-slate-400">Tiempo activo</p>
          <p
            class="text-right text-slate-800"
            :class="isDark() ? 'text-slate-100' : ''"
          >
            0 h
          </p>
        </div>

        <div class="mb-3 space-y-1 text-[11px] text-slate-400">
          <p>Último inicio: --</p>
          <p>Último cierre: --</p>
        </div>

        <div class="mt-1 flex justify-end">
          <RouterLink
            :to="{
              name: 'machine-resumen',
              params: { id: machine.name },
              query: { location: machine.location, status: 'Activa' },
            }"
            class="inline-flex w-full items-center justify-between rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white shadow-sm sm:w-auto sm:px-5 cursor-pointer"
            :class="isDark() ? 'hover:bg-red-500' : 'hover:bg-red-700'"
          >
            <span>Ver detalles</span>
            <span>➜</span>
          </RouterLink>
        </div>
      </article>
    </section>
  </div>
</template>
