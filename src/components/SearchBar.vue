<script setup lang="ts">
/* global defineProps, defineEmits, withDefaults */
type Props = {
  modelValue: string;
  isDark: boolean;
  placeholder?: string;
};

withDefaults(defineProps<Props>(), {
  placeholder: "Buscar...",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();
</script>

<template>
  <div
    class="flex items-center gap-2 rounded-full border px-3 py-2 text-sm backdrop-blur"
    :class="
      isDark
        ? 'border-zinc-800/70 bg-zinc-950/20 text-zinc-200'
        : 'border-slate-200/70 bg-white/50 text-slate-600'
    "
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-4 w-4 text-slate-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      class="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
      @input="
        emit('update:modelValue', ($event.target as HTMLInputElement).value)
      "
    />
  </div>
</template>

<style scoped></style>
