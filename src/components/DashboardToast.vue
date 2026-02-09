<script setup lang="ts">
/* global defineProps, defineEmits */
import { computed } from "vue";

type ToastType = "machine_on" | "machine_off" | "coin_inserted" | "event";

type ToastPayload = {
  title: string;
  body?: string;
  type: ToastType;
};

const props = defineProps<{
  toast: ToastPayload | null;
  dark: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const isDark = computed(() => !!props.dark);

const toastClasses = computed(() => {
  const t = props.toast?.type;
  if (t === "coin_inserted") {
    return isDark.value
      ? "bg-amber-500/10 border-amber-500/30 text-amber-100"
      : "bg-amber-50 border-amber-200 text-amber-900";
  }
  if (t === "machine_on") {
    return isDark.value
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-100"
      : "bg-emerald-50 border-emerald-200 text-emerald-900";
  }
  if (t === "machine_off") {
    return isDark.value
      ? "bg-rose-500/10 border-rose-500/30 text-rose-100"
      : "bg-rose-50 border-rose-200 text-rose-900";
  }
  return isDark.value
    ? "bg-zinc-900/80 border-zinc-700/60 text-white"
    : "bg-white/80 border-slate-200/70 text-slate-800";
});

const toastAccentClass = computed(() => {
  const t = props.toast?.type;
  if (t === "coin_inserted") return "bg-amber-400";
  if (t === "machine_on") return "bg-emerald-400";
  if (t === "machine_off") return "bg-rose-400";
  return isDark.value ? "bg-zinc-500" : "bg-slate-400";
});

const toastIconClass = computed(() => {
  const t = props.toast?.type;
  if (t === "coin_inserted") {
    return isDark.value
      ? "bg-amber-500/15 text-amber-200"
      : "bg-amber-100 text-amber-700";
  }
  if (t === "machine_on") {
    return isDark.value
      ? "bg-emerald-500/15 text-emerald-200"
      : "bg-emerald-100 text-emerald-700";
  }
  if (t === "machine_off") {
    return isDark.value
      ? "bg-rose-500/15 text-rose-200"
      : "bg-rose-100 text-rose-700";
  }
  return isDark.value
    ? "bg-zinc-800/80 text-zinc-200"
    : "bg-slate-100 text-slate-600";
});
</script>

<template>
  <Teleport to="body">
    <div v-if="toast" class="fixed top-4 right-4 z-9999">
      <div
        :class="[
          'relative w-auto max-w-xs rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-xl',
          toastClasses,
        ]"
      >
        <span
          class="absolute left-0 top-3 bottom-3 w-1 rounded-full"
          :class="toastAccentClass"
        ></span>
        <div class="flex items-start gap-3 pl-1">
          <div
            class="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full"
            :class="toastIconClass"
          >
            <svg
              v-if="toast.type === 'coin_inserted'"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="8"
                stroke="currentColor"
                stroke-width="2"
              />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
            <svg
              v-else-if="toast.type === 'machine_on'"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 2v10"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M7.05 6.05a7 7 0 1 0 9.9 0"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <svg
              v-else-if="toast.type === 'machine_off'"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 2v10"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M7.05 6.05a7 7 0 1 0 9.9 0"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <svg
              v-else
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M13.73 21a2 2 0 0 1-3.46 0"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="flex-1">
            <p class="text-sm font-semibold">{{ toast.title }}</p>
            <p
              v-if="toast.body"
              class="text-xs"
              :class="isDark ? 'text-zinc-300' : 'text-slate-600'"
            >
              {{ toast.body }}
            </p>
          </div>
          <button
            type="button"
            class="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:text-slate-600"
            :class="isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'"
            @click="emit('close')"
          >
            <span class="text-sm">x</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
