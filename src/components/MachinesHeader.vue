<script setup lang="ts">
/* global defineProps, defineEmits */
import { useTheme } from "@/composables/useTheme";

defineProps<{
  sidebarOpen: boolean;
  totalMachines: number;
  activeMachines: number;
  inactiveMachines: number;
  maintenanceMachines: number;
  currentRole: string;
}>();

const emit = defineEmits<{
  (e: "update:sidebarOpen", value: boolean): void;
  (e: "refresh"): void;
  (e: "create"): void;
}>();

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;

function openSidebar() {
  emit("update:sidebarOpen", true);
}

function refresh() {
  emit("refresh");
}

function createMachine() {
  emit("create");
}
</script>

<template>
  <header
    class="flex flex-col gap-4 rounded-2xl border backdrop-blur-xl px-4 py-4 shadow-sm sm:px-8 sm:py-5"
    :class="
      isDark()
        ? 'bg-zinc-900/70 border-zinc-800/70 text-white'
        : 'bg-white/60 border-slate-200/70 text-slate-900'
    "
  >
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-3 min-w-0">
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border text-slate-500 transition cursor-pointer group overflow-hidden shrink-0"
          :class="
            isDark()
              ? 'border-zinc-700/70 hover:bg-transparent hover:text-white'
              : 'border-sky-300/80 hover:bg-transparent hover:text-sky-700'
          "
          aria-label="Abrir menú lateral"
          @click="openSidebar"
        >
          <img
            src="/img/icons/K11BOX.webp"
            alt="MachineHub logo"
            class="h-full w-full object-cover rounded-full transition-transform duration-200 group-hover:scale-105 group-hover:shadow-lg"
          />
        </button>
        <div class="min-w-0">
          <div class="flex flex-wrap items-baseline gap-2">
            <h1 class="text-xl font-semibold sm:text-2xl">Máquinas</h1>
            <span
              class="text-xs font-medium tracking-wide"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              Gestión de flota
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border transition cursor-pointer"
          :class="
            isDark()
              ? 'border-zinc-700/60 bg-zinc-950/20 text-zinc-100 hover:bg-zinc-950/30'
              : 'border-sky-300/80 bg-sky-50/70 text-sky-700 hover:bg-sky-50/90'
          "
          aria-label="Refrescar"
          title="Refrescar"
          @click="refresh"
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M21 12a9 9 0 1 1-3.27-6.93"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M21 3v6h-6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <button
          v-if="currentRole !== 'employee' && currentRole !== 'operator'"
          type="button"
          class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:text-sm cursor-pointer whitespace-nowrap"
          :class="
            isDark()
              ? 'bg-zinc-200 text-zinc-900 hover:bg-zinc-100 focus-visible:ring-zinc-300/60'
              : 'bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-500/50'
          "
          @click="createMachine"
        >
          <span class="mr-1">+</span>
          <span>Nueva máquina</span>
        </button>
      </div>
    </div>

    <div v-if="$slots.summary" class="mt-4">
      <slot name="summary" />
    </div>

    <div v-else class="mt-4 flex flex-wrap gap-3 text-xs">
      <div
        class="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-3 py-1.5"
        :class="
          isDark()
            ? 'bg-zinc-900/40 text-zinc-100'
            : 'bg-slate-100 text-slate-800'
        "
      >
        <span class="font-semibold">Total:</span>
        <span>{{ totalMachines }}</span>
      </div>
      <div
        class="inline-flex items-center gap-1 rounded-full bg-emerald-500/5 px-3 py-1.5"
        :class="
          isDark()
            ? 'bg-emerald-900/30 text-emerald-100'
            : 'bg-emerald-50 text-emerald-700'
        "
      >
        <span class="font-semibold">Activas:</span>
        <span>{{ activeMachines }}</span>
      </div>
      <div
        class="inline-flex items-center gap-1 rounded-full bg-red-500/5 px-3 py-1.5"
        :class="
          isDark() ? 'bg-red-900/30 text-red-100' : 'bg-red-50 text-red-700'
        "
      >
        <span class="font-semibold">Inactivas:</span>
        <span>{{ inactiveMachines }}</span>
      </div>
      <div
        class="inline-flex items-center gap-1 rounded-full bg-amber-500/5 px-3 py-1.5"
        :class="
          isDark()
            ? 'bg-amber-900/30 text-amber-100'
            : 'bg-amber-50 text-amber-700'
        "
      >
        <span class="font-semibold">Mantenimiento:</span>
        <span>{{ maintenanceMachines }}</span>
      </div>
    </div>
  </header>
</template>
