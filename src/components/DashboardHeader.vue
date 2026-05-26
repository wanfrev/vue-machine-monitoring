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
    class="flex flex-col gap-4 rounded-2xl border backdrop-blur-xl px-4 py-4 shadow-sm sm:px-6 sm:py-5"
    :class="
      isDark
        ? 'bg-zinc-900 border-zinc-800 text-white'
        : 'bg-white/80 border-slate-200/80 text-slate-900'
    "
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
            alt="MachineHub logo"
            class="h-7 w-7 sm:h-8 sm:w-8 object-cover rounded-lg transition-transform duration-200 group-hover:scale-105"
          />
        </button>
        <div class="min-w-0">
          <h1
            class="text-lg sm:text-xl lg:text-2xl font-semibold leading-tight truncate"
          >
            MachineHub
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
        <div class="text-right">
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

    <div
      v-if="!isOperator"
      class="grid grid-cols-2 gap-3 pt-2 auto-rows-fr sm:grid-cols-2 lg:grid-cols-4"
    >
      <div
        class="rounded-2xl border px-4 py-3 text-sm"
        :class="
          isDark
            ? 'border-sky-900/40 bg-sky-950/25 text-sky-50'
            : 'border-sky-100 bg-sky-50 text-sky-900'
        "
      >
        <div class="mb-2 flex items-center gap-2">
          <div
            class="flex h-7 w-7 items-center justify-center rounded-full text-xs"
            :class="
              isDark
                ? 'bg-sky-500/10 text-sky-200 ring-1 ring-sky-500/20'
                : 'bg-white/70 text-sky-600'
            "
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect
                x="4"
                y="4"
                width="16"
                height="4"
                rx="1.5"
                stroke="currentColor"
                stroke-width="1.6"
              />
              <rect
                x="4"
                y="10"
                width="16"
                height="4"
                rx="1.5"
                stroke="currentColor"
                stroke-width="1.6"
              />
              <rect
                x="4"
                y="16"
                width="16"
                height="4"
                rx="1.5"
                stroke="currentColor"
                stroke-width="1.6"
              />
            </svg>
          </div>
          <p
            class="text-[11px] font-semibold uppercase tracking-wide"
            :class="isDark ? 'text-sky-200' : 'text-sky-700'"
          >
            Total de máquinas
          </p>
        </div>
        <p
          class="text-3xl font-semibold leading-tight"
          :class="isDark ? 'text-sky-50' : 'text-slate-900'"
        >
          {{ totalMachines }}
        </p>
      </div>

      <div
        class="rounded-2xl border px-4 py-3 text-sm"
        :class="
          isDark
            ? 'border-emerald-900/40 bg-emerald-950/20 text-emerald-50'
            : 'border-emerald-100 bg-emerald-50 text-emerald-800'
        "
      >
        <div class="mb-2 flex items-center gap-2">
          <div
            class="flex h-7 w-7 items-center justify-center rounded-full text-xs"
            :class="
              isDark
                ? 'bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/20'
                : 'bg-white/70 text-emerald-600'
            "
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M4 12h3l2-5 4 10 2-5h5"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <p
            class="text-[11px] font-semibold uppercase tracking-wide"
            :class="isDark ? 'text-emerald-200' : 'text-emerald-700'"
          >
            Máquinas activas
          </p>
        </div>
        <p
          class="text-3xl font-semibold leading-tight"
          :class="isDark ? 'text-emerald-50' : 'text-emerald-700'"
        >
          {{ activeMachines }}
        </p>
      </div>

      <div
        class="rounded-2xl border px-4 py-3 text-sm"
        :class="
          isDark
            ? 'border-red-900/40 bg-red-950/20 text-red-50'
            : 'border-red-100 bg-red-50 text-red-800'
        "
      >
        <div class="mb-2 flex items-center gap-2">
          <div
            class="flex h-7 w-7 items-center justify-center rounded-full text-xs"
            :class="
              isDark
                ? 'bg-red-500/10 text-red-200 ring-1 ring-red-500/20'
                : 'bg-white/70 text-red-600'
            "
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 3 3 19h18L12 3Z"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linejoin="round"
              />
              <path
                d="M12 9v5"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
              <circle cx="12" cy="16.5" r="0.75" fill="currentColor" />
            </svg>
          </div>
          <p
            class="text-[11px] font-semibold uppercase tracking-wide"
            :class="isDark ? 'text-red-200' : 'text-red-700'"
          >
            Máquinas inactivas
          </p>
        </div>
        <p
          class="text-3xl font-semibold leading-tight"
          :class="isDark ? 'text-red-50' : 'text-red-700'"
        >
          {{ inactiveMachines }}
        </p>
      </div>

      <div
        v-if="!isOperator"
        class="rounded-2xl border px-4 py-3 text-sm"
        :class="
          isDark
            ? 'border-amber-900/40 bg-amber-950/20 text-amber-50'
            : 'border-amber-100 bg-amber-50 text-amber-800'
        "
      >
        <div class="mb-2 flex items-center gap-2">
          <div
            class="flex h-7 w-7 items-center justify-center rounded-full text-xs"
            :class="
              isDark
                ? 'bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/25'
                : 'bg-white/70 text-amber-600'
            "
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <ellipse
                cx="12"
                cy="7"
                rx="6.5"
                ry="3.5"
                stroke="currentColor"
                stroke-width="1.8"
              />
              <path
                d="M5.5 11.5C5.5 13.157 8.038 14.5 12 14.5C15.962 14.5 18.5 13.157 18.5 11.5"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
              <path
                d="M5.5 16C5.5 17.657 8.038 19 12 19C15.962 19 18.5 17.657 18.5 16"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
          </div>
          <p
            class="text-[11px] font-semibold uppercase tracking-wide"
            :class="isDark ? 'text-amber-200' : 'text-amber-700'"
          >
            Monedas hoy
          </p>
        </div>
        <p
          class="text-3xl font-semibold leading-tight"
          :class="isDark ? 'text-amber-50' : 'text-slate-900'"
        >
          {{ totalCoinsToday }}
        </p>
      </div>
    </div>
  </header>
</template>
