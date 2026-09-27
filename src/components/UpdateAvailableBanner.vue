<script setup lang="ts">
import { useServiceWorkerUpdate } from "@/composables/useServiceWorkerUpdate";
import { useTheme } from "@/composables/useTheme";

const { showUpdateCard, applyUpdate } = useServiceWorkerUpdate();
const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;
</script>

<template>
  <Teleport to="body">
    <transition name="slide-down">
      <div
        v-if="showUpdateCard"
        class="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center px-3"
        style="padding-top: calc(0.75rem + env(safe-area-inset-top))"
      >
        <div
          class="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl"
          :class="
            isDark()
              ? 'border-amber-400/30 bg-zinc-900/95'
              : 'border-amber-200/70 bg-white/95'
          "
        >
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            :class="
              isDark()
                ? 'bg-amber-500/15 text-amber-200'
                : 'bg-amber-100 text-amber-700'
            "
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 3v10"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M5.5 7.5a7 7 0 1 0 13 0"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold">Nueva versión disponible</p>
            <p
              class="text-xs"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              Toca para actualizar
            </p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold"
            :class="
              isDark()
                ? 'bg-amber-400/90 text-black hover:bg-amber-400'
                : 'bg-amber-400 text-black hover:bg-amber-300'
            "
            @click="applyUpdate"
          >
            Recargar
          </button>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.24s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  transform: translate3d(0, -12px, 0);
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .slide-down-enter-active,
  .slide-down-leave-active {
    transition: none;
  }
}
</style>
