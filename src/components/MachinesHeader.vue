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
    class="flex flex-col gap-4 rounded-2xl border backdrop-blur-xl px-4 py-4 shadow-sm sm:px-6 sm:py-5"
    :class="
      isDark()
        ? 'bg-zinc-900/70 border-zinc-800/70 text-white'
        : 'bg-white/60 border-slate-200/70 text-slate-900'
    "
  >
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 min-w-0">
        <button
          type="button"
          class="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl transition cursor-pointer group overflow-hidden shrink-0"
          :class="isDark() ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'"
          aria-label="Abrir menú lateral"
          @click="openSidebar"
        >
          <img
            src="/img/icons/K11BOX.webp"
            alt="MachineHub logo"
            class="h-7 w-7 sm:h-8 sm:w-8 object-cover rounded-lg transition-transform duration-200 group-hover:scale-105"
          />
        </button>
        <div class="min-w-0">
          <h1
            class="text-lg sm:text-xl lg:text-2xl font-semibold leading-tight truncate"
          >
            Máquinas
          </h1>
          <p
            class="text-xs truncate"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            Gestión de flota
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <button
          type="button"
          class="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border transition cursor-pointer shrink-0"
          :class="
            isDark()
              ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          "
          aria-label="Refrescar"
          title="Refrescar"
          @click="refresh"
        >
          <svg
            class="h-4 w-4 sm:h-5 sm:w-5"
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
          class="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:text-sm cursor-pointer whitespace-nowrap"
          :class="
            isDark()
              ? 'bg-zinc-200 text-zinc-900 hover:bg-zinc-100 focus-visible:ring-zinc-300/60'
              : 'bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-500/50'
          "
          @click="createMachine"
        >
          <span class="mr-1 hidden sm:inline">+</span>
          <span class="hidden sm:inline">Nueva máquina</span>
          <span class="sm:hidden">+</span>
        </button>
      </div>
    </div>
  </header>
</template>
