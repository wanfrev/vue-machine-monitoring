<script setup lang="ts">
/* global defineProps, defineEmits */
import { computed, onMounted, onUnmounted, ref } from "vue";

const props = defineProps<{
  currentUserName: string;
  totalMachines: number;
  activeMachines: number;
  inactiveMachines: number;
  totalCoinsToday: number;
  isOperator: boolean;
  dark: boolean;
}>();

const emit = defineEmits<{
  (e: "open-sidebar"): void;
  (e: "refresh"): void;
}>();

const isDark = computed(() => !!props.dark);
const now = ref(new Date());
const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  hour12: true,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});
const timeText = computed(() => timeFormatter.format(now.value));
const dateText = computed(() => dateFormatter.format(now.value));

let clockTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  clockTimer = setInterval(() => {
    now.value = new Date();
  }, 1000);
});

onUnmounted(() => {
  if (clockTimer) {
    clearInterval(clockTimer);
  }
});

function handleOpenSidebar() {
  emit("open-sidebar");
}

function handleRefresh() {
  emit("refresh");
}
</script>

<template>
  <header
    class="flex flex-col rounded-2xl border backdrop-blur-xl shadow-sm"
    :class="[
      isOperator
        ? 'gap-4 px-4 py-4 sm:px-6 sm:py-5'
        : 'gap-2 px-3 py-2.5 sm:px-6 sm:py-4',
      isDark
        ? 'bg-zinc-900 border-zinc-800 text-white'
        : 'bg-white/80 border-slate-200/80 text-slate-900',
    ]"
  >
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 min-w-0">
        <button
          type="button"
          class="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl transition cursor-pointer group overflow-hidden shrink-0"
          :class="isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'"
          aria-label="Abrir menú lateral"
          @click="handleOpenSidebar"
        >
          <img
            src="/img/icons/K11BOX.webp"
            alt="K11 Box logo"
            class="h-7 w-7 sm:h-8 sm:w-8 object-cover rounded-lg transition-transform duration-200 group-hover:scale-105"
          />
        </button>
        <div class="min-w-0">
          <h1
            class="text-lg sm:text-xl lg:text-2xl font-semibold leading-tight truncate"
          >
            {{ isOperator ? "K11 Box" : "Máquinas" }}
          </h1>
          <p
            class="text-xs truncate"
            :class="isDark ? 'text-zinc-400' : 'text-slate-500'"
          >
            Hola, <span class="font-medium">{{ currentUserName }}</span>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <div class="text-right" :class="isOperator ? '' : 'hidden sm:block'">
          <p
            class="text-base sm:text-lg font-bold leading-none tracking-tight"
            :class="isDark ? 'text-white' : 'text-slate-900'"
          >
            {{ timeText }}
          </p>
          <p
            class="text-[10px] sm:text-xs mt-0.5 sm:mt-1 capitalize"
            :class="isDark ? 'text-zinc-400' : 'text-slate-500'"
          >
            {{ dateText }}
          </p>
        </div>
        <slot name="actions" />
        <button
          type="button"
          class="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border transition cursor-pointer shrink-0"
          :class="
            isDark
              ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          "
          aria-label="Refrescar"
          @click="handleRefresh"
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
      </div>
    </div>
  </header>
</template>
