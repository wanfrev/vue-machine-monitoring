<script setup lang="ts">
/* global defineProps, defineEmits */
import { computed } from "vue";
import type { Machine } from "@/types/machine";

const props = defineProps<{
  machine: Machine;
  isOpen: boolean;
  dark: boolean;
  isAdmin: boolean;
}>();

const emit = defineEmits<{
  (e: "toggle-maintenance", machine: Machine): void;
  (e: "toggle-test-mode", machine: Machine): void;
  (e: "close", machineId: string): void;
}>();

const isDark = computed(() => !!props.dark);
</script>

<template>
  <div
    v-if="isOpen && isAdmin"
    class="absolute top-12 z-20 rounded-xl border text-xs shadow-lg left-4 right-4 sm:left-auto sm:right-4 w-auto sm:w-48 max-w-[90vw]"
    :class="
      isDark
        ? 'border-zinc-800/70 bg-zinc-950/70 backdrop-blur-xl text-zinc-100'
        : 'border-slate-200/70 bg-white/70 backdrop-blur-xl text-slate-700'
    "
    data-status-menu
    @click.stop
  >
    <p
      class="px-3 pt-2 pb-1 text-[11px] font-medium"
      :class="isDark ? 'text-zinc-400' : 'text-slate-400'"
    >
      Modo mantenimiento
    </p>
    <button
      type="button"
      class="flex w-full items-center justify-between px-3 py-1.5 text-left"
      :class="
        isDark
          ? 'text-zinc-200 hover:bg-zinc-100/10'
          : 'text-slate-600 hover:bg-slate-50'
      "
      @click.stop="emit('toggle-maintenance', machine)"
    >
      <div class="flex items-center gap-2">
        <span
          v-if="machine.status === 'maintenance'"
          class="h-1.5 w-1.5 rounded-full bg-emerald-500"
        ></span>
        <span class="text-[11px]">
          {{
            machine.status === "maintenance"
              ? "Quitar mantenimiento"
              : "Poner en mantenimiento"
          }}
        </span>
      </div>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        class="text-slate-400"
      >
        <path
          d="M9 18l6-6-6-6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <button
      type="button"
      class="flex w-full items-center justify-between px-3 py-1.5 text-left"
      :class="
        isDark
          ? 'text-zinc-200 hover:bg-zinc-100/10'
          : 'text-slate-600 hover:bg-slate-50'
      "
      @click.stop="emit('toggle-test-mode', machine)"
    >
      <div class="flex items-center gap-2">
        <span
          v-if="machine && machine.test_mode"
          class="h-1.5 w-1.5 rounded-full bg-amber-400"
        ></span>
        <span class="text-[11px]">
          {{
            machine && machine.test_mode
              ? "Quitar modo prueba"
              : "Activar modo prueba"
          }}
        </span>
      </div>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        class="text-slate-400"
      >
        <path
          d="M9 18l6-6-6-6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <button
      type="button"
      class="w-full px-3 py-1.5 text-left text-[11px]"
      :class="
        isDark
          ? 'text-zinc-400 hover:bg-zinc-100/10'
          : 'text-slate-400 hover:bg-slate-50'
      "
      @click.stop="emit('close', machine.id)"
    >
      Cancelar
    </button>
  </div>
</template>
