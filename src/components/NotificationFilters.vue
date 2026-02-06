<script setup lang="ts">
/* global defineProps, defineEmits */
import { computed } from "vue";

const props = defineProps<{
  dark: boolean;
  isTodayOnly: boolean;
  notificationFrom: string | null;
  notificationTo: string | null;
}>();

const emit = defineEmits([
  "update:is-today-only",
  "update:notification-from",
  "update:notification-to",
  "apply-today",
  "apply-range",
]);

const isDark = computed(() => !!props.dark);

function updateFrom(value: string) {
  emit("update:notification-from", value || null);
}

function updateTo(value: string) {
  emit("update:notification-to", value || null);
}

function applyToday() {
  emit("update:is-today-only", true);
  emit("apply-today");
}

function applyRange() {
  emit("update:is-today-only", false);
  emit("apply-range");
}
</script>

<template>
  <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
    <button
      type="button"
      class="px-3 py-1.5 rounded-full text-[11px] font-medium border transition"
      :class="
        isTodayOnly
          ? 'bg-slate-900 text-white border-slate-900'
          : isDark
          ? 'bg-slate-950/10 text-slate-200 border-slate-700/60 hover:bg-slate-950/20'
          : 'bg-white/40 text-slate-700 border-slate-200/70 hover:bg-white/60'
      "
      @click="applyToday"
    >
      Hoy
    </button>

    <div
      class="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto"
    >
      <input
        type="date"
        :value="notificationFrom || ''"
        class="px-2.5 py-1.5 rounded text-[11px] border w-full sm:w-32 placeholder-slate-400"
        :class="
          isDark
            ? 'bg-slate-900 text-slate-200 border-slate-700/60 placeholder-slate-400'
            : 'bg-white/90 text-slate-700 border-slate-200/70 placeholder-slate-400'
        "
        @input="updateFrom(($event.target as HTMLInputElement).value)"
      />
      <div class="flex items-center justify-center text-xs text-slate-400 py-1">
        a
      </div>
      <input
        type="date"
        :value="notificationTo || ''"
        class="px-2.5 py-1.5 rounded text-[11px] border w-full sm:w-32 placeholder-slate-400"
        :class="
          isDark
            ? 'bg-slate-900 text-slate-200 border-slate-700/60 placeholder-slate-400'
            : 'bg-white/90 text-slate-700 border-slate-200/70 placeholder-slate-400'
        "
        @input="updateTo(($event.target as HTMLInputElement).value)"
      />
      <button
        type="button"
        class="px-3 py-1.5 rounded-full text-[11px] font-medium border transition w-full sm:w-auto"
        :class="
          isDark
            ? isTodayOnly
              ? 'bg-transparent text-slate-500 border-slate-700/60 hover:border-slate-600 hover:text-slate-300'
              : 'bg-transparent text-slate-200 border-slate-600 hover:border-slate-500'
            : isTodayOnly
            ? 'bg-transparent text-slate-400 border-slate-200/70 hover:border-slate-300 hover:text-slate-600'
            : 'bg-transparent text-slate-700 border-slate-300 hover:border-slate-400'
        "
        @click="applyRange"
      >
        Aplicar
      </button>
    </div>
  </div>
</template>
