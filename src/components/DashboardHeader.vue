<script setup lang="ts">
import { computed, defineProps, defineEmits } from "vue";

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

function handleOpenSidebar() {
  emit("open-sidebar");
}

function handleRefresh() {
  emit("refresh");
}
</script>

<template>
  <header
    class="flex flex-col gap-4 rounded-2xl border bg-white/60 backdrop-blur-xl px-4 py-4 shadow-sm sm:px-8 sm:py-5"
    :class="
      isDark
        ? 'bg-slate-900/40 border-slate-700/60 text-white'
        : 'bg-white/60 border-slate-200/70 text-slate-900'
    "
  >
    <div class="flex items-start justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full border text-slate-500 transition cursor-pointer group overflow-hidden"
            :class="
              isDark
                ? 'border-red-300 hover:bg-transparent hover:text-white'
                : 'border-red-200 hover:bg-transparent hover:text-red-700'
            "
            aria-label="Abrir menú lateral"
            @click="handleOpenSidebar"
          >
            <img
              src="/img/icons/K11BOX.webp"
              alt="MachineHub logo"
              class="h-full w-full object-cover rounded-full transition-transform duration-200 group-hover:scale-105 group-hover:shadow-lg"
            />
          </button>
          <h1 class="text-xl font-semibold sm:text-2xl">MachineHub</h1>
        </div>
        <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
          Panel de control
        </p>
        <p
          class="text-sm"
          :class="isDark ? 'text-slate-300' : 'text-slate-500'"
        >
          Bienvenido,
          <span class="font-medium">{{ currentUserName }}</span
          >.
        </p>
      </div>
      <div class="shrink-0">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border transition cursor-pointer"
          :class="
            isDark
              ? 'border-red-400/30 bg-red-950/10 text-red-100 hover:bg-red-950/20'
              : 'border-red-200/80 bg-red-50/60 text-red-700 hover:bg-red-50/80'
          "
          aria-label="Refrescar"
          @click="handleRefresh"
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
      </div>
    </div>

    <div
      class="grid grid-cols-2 gap-3 pt-2 auto-rows-fr sm:grid-cols-2 lg:grid-cols-4"
    >
      <div
        class="rounded-2xl border px-4 py-3 text-sm"
        :class="
          isDark
            ? 'border-sky-500/30 bg-sky-950/20 text-sky-100'
            : 'border-sky-100 bg-sky-50 text-sky-900'
        "
      >
        <div class="mb-2 flex items-center gap-2">
          <div
            class="flex h-7 w-7 items-center justify-center rounded-full text-xs"
            :class="
              isDark ? 'bg-sky-900/40 text-sky-200' : 'bg-white/70 text-sky-600'
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
            ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-100'
            : 'border-emerald-100 bg-emerald-50 text-emerald-800'
        "
      >
        <div class="mb-2 flex items-center gap-2">
          <div
            class="flex h-7 w-7 items-center justify-center rounded-full text-xs"
            :class="
              isDark
                ? 'bg-emerald-900/40 text-emerald-200'
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
            ? 'border-red-500/30 bg-red-950/20 text-red-100'
            : 'border-red-100 bg-red-50 text-red-800'
        "
      >
        <div class="mb-2 flex items-center gap-2">
          <div
            class="flex h-7 w-7 items-center justify-center rounded-full text-xs"
            :class="
              isDark ? 'bg-red-900/40 text-red-200' : 'bg-white/70 text-red-600'
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
            ? 'border-amber-500/30 bg-amber-950/15 text-amber-100'
            : 'border-amber-100 bg-amber-50 text-amber-800'
        "
      >
        <div class="mb-2 flex items-center gap-2">
          <div
            class="flex h-7 w-7 items-center justify-center rounded-full text-xs"
            :class="
              isDark
                ? 'bg-amber-900/40 text-amber-200'
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
