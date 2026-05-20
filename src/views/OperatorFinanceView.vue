<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import { ref } from "vue";
import { useTheme } from "@/composables/useTheme";

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;

const sidebarOpen = ref(false);
</script>

<template>
  <AppSidebar
    :open="sidebarOpen"
    :dark="isDark()"
    @close="sidebarOpen = false"
  />

  <div
    :class="[
      'min-h-screen px-3 py-4 sm:px-8 sm:py-6 space-y-6',
      isDark() ? 'bg-zinc-950' : 'bg-slate-100',
    ]"
  >
    <header
      class="flex flex-col gap-4 rounded-2xl border backdrop-blur-xl px-4 py-4 shadow-sm sm:px-6 sm:py-5"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-white'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 min-w-0">
          <button
            type="button"
            class="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl transition cursor-pointer group overflow-hidden shrink-0"
            :class="isDark() ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'"
            aria-label="Abrir menú lateral"
            @click="sidebarOpen = true"
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
              Finanzas
            </h1>
            <p
              class="text-xs truncate"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              Totales y analitica
            </p>
          </div>
        </div>
      </div>
    </header>

    <section
      class="rounded-2xl border backdrop-blur-xl p-4 shadow-sm sm:p-6"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-zinc-100'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <p class="text-sm" :class="isDark() ? 'text-zinc-300' : 'text-slate-600'">
        No tienes acceso a finanzas.
      </p>
    </section>
  </div>
</template>
