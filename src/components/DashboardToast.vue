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
      ? "bg-amber-900/20 border border-amber-700 text-amber-200"
      : "bg-amber-50 border border-amber-200 text-amber-800";
  }
  if (t === "machine_on") {
    return isDark.value
      ? "bg-emerald-900/20 border border-emerald-700 text-emerald-200"
      : "bg-emerald-50 border border-emerald-200 text-emerald-800";
  }
  if (t === "machine_off") {
    return isDark.value
      ? "bg-red-900/20 border border-red-700 text-red-200"
      : "bg-red-50 border border-red-200 text-red-800";
  }
  return isDark.value
    ? "bg-slate-900 border border-slate-700/60 text-white"
    : "bg-white border border-slate-200/70 text-slate-800";
});
</script>

<template>
  <Teleport to="body">
    <div v-if="toast" class="fixed top-4 right-4 z-9999">
      <div
        :class="[
          'rounded-lg px-4 py-3 shadow-lg w-auto max-w-xs',
          isDark ? 'text-white' : 'text-slate-800',
          toastClasses,
        ]"
      >
        <div class="flex items-start gap-3">
          <div class="flex-1">
            <p class="font-semibold text-sm">{{ toast.title }}</p>
            <p
              v-if="toast.body"
              class="text-xs"
              :class="isDark ? 'text-slate-300' : 'text-slate-600'"
            >
              {{ toast.body }}
            </p>
          </div>
          <button
            type="button"
            class="ml-2 text-slate-400 hover:text-slate-600"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
