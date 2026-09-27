<script setup lang="ts">
/* global defineProps, defineEmits */
type Props = {
  start: string;
  end: string;
  isDark: boolean;
  hasActiveFilter: boolean;
};

defineProps<Props>();

const emit = defineEmits<{
  (e: "update:start", value: string): void;
  (e: "update:end", value: string): void;
  (e: "clear"): void;
}>();
</script>

<template>
  <div
    class="w-full sm:w-auto flex flex-wrap items-center gap-2 rounded-full border px-3 py-2 text-xs sm:text-sm backdrop-blur"
    :class="
      isDark
        ? 'border-zinc-800/70 bg-zinc-950/20 text-zinc-200'
        : 'border-slate-200/70 bg-white/50 text-slate-600'
    "
  >
    <input
      :value="start"
      type="date"
      class="min-w-0 flex-1 rounded-md border backdrop-blur px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400/40 focus:border-zinc-500 dark:border-zinc-700/60 dark:bg-zinc-950/20 dark:text-zinc-100 dark:[color-scheme:dark]"
      :class="
        isDark
          ? 'border-zinc-700/60 bg-zinc-950/20 text-zinc-100'
          : 'border-slate-200/70 bg-white/40 text-slate-700'
      "
      @input="emit('update:start', ($event.target as HTMLInputElement).value)"
    />
    <span class="text-slate-400">a</span>
    <input
      :value="end"
      type="date"
      class="min-w-0 flex-1 rounded-md border backdrop-blur px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400/40 focus:border-zinc-500 dark:border-zinc-700/60 dark:bg-zinc-950/20 dark:text-zinc-100 dark:[color-scheme:dark]"
      :class="
        isDark
          ? 'border-zinc-700/60 bg-zinc-950/20 text-zinc-100'
          : 'border-slate-200/70 bg-white/40 text-slate-700'
      "
      @input="emit('update:end', ($event.target as HTMLInputElement).value)"
    />
    <button
      v-if="hasActiveFilter"
      type="button"
      class="rounded-md border px-2 py-1 text-xs font-medium"
      :class="
        isDark
          ? 'border-zinc-700/60 bg-zinc-950/20 text-zinc-200 hover:bg-zinc-100/10'
          : 'border-slate-200/70 bg-white/50 text-slate-700 hover:bg-white/70'
      "
      @click="emit('clear')"
    >
      Borrar filtro
    </button>
  </div>
</template>

<style scoped></style>
