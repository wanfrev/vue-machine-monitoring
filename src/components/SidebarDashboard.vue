<script setup lang="ts">
import { inject, type Ref, ref } from "vue";

const injectedDark = inject<Ref<boolean> | boolean>("darkMode", false);
const isDark = () => {
  if (typeof injectedDark === "boolean") return injectedDark;
  return !!injectedDark?.value;
};
const open = ref(false);
</script>

<template>
  <!-- Overlay for mobile sidebar -->
  <div
    v-if="open"
    :class="[
      'fixed inset-0 z-30 backdrop-blur-sm sm:hidden',
      isDark() ? 'bg-slate-900 bg-opacity-40' : 'bg-white bg-opacity-20',
    ]"
    @click="open = false"
  ></div>

  <!-- Sidebar -->
  <aside
    :class="[
      'fixed top-0 left-0 h-full z-40 flex flex-col w-64 transition-transform duration-300',
      isDark()
        ? 'bg-slate-900 text-white border-r border-slate-800'
        : 'bg-white text-slate-900 border-r border-slate-200',
      open ? 'translate-x-0' : '-translate-x-full',
      'sm:translate-x-0 sm:static sm:h-auto sm:w-64',
    ]"
  >
    <div
      class="flex items-center gap-2 px-6 py-4 border-b"
      :class="isDark() ? 'border-slate-800' : 'border-slate-200'"
    >
      <span
        :class="[
          'inline-flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold',
          isDark() ? 'bg-red-700' : 'bg-red-600',
        ]"
      >
        B
      </span>
      <span
        :class="[
          'font-semibold tracking-wide',
          isDark() ? 'text-white' : 'text-slate-900',
        ]"
      >
        Boxes Monitor
      </span>
    </div>
    <nav class="flex flex-col gap-2 px-6 py-4 text-sm flex-1">
      <router-link
        to="/"
        :class="[
          'px-3 py-2 rounded-lg',
          isDark()
            ? 'hover:bg-red-900 text-white'
            : 'hover:bg-red-50 text-slate-800',
        ]"
        :active-class="
          isDark() ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'
        "
        exact
        @click="open = false"
      >
        Dashboard
      </router-link>
      <router-link
        to="/machines"
        :class="[
          'px-3 py-2 rounded-lg',
          isDark()
            ? 'hover:bg-red-900 text-white'
            : 'hover:bg-red-50 text-slate-800',
        ]"
        :active-class="
          isDark() ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'
        "
        @click="open = false"
      >
        Máquinas
      </router-link>
      <router-link
        to="/employees"
        :class="[
          'px-3 py-2 rounded-lg',
          isDark()
            ? 'hover:bg-red-900 text-white'
            : 'hover:bg-red-50 text-slate-800',
        ]"
        :active-class="
          isDark() ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'
        "
        @click="open = false"
      >
        Empleados
      </router-link>
    </nav>
    <div class="px-6 pb-6">
      <button
        @click="$emit('toggle-dark')"
        class="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-transparent transition bg-transparent cursor-pointer"
        aria-label="Cambiar modo"
      >
        <span v-if="isDark()">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="opacity-70"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
          </svg>
        </span>
        <span v-else>
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="opacity-70"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        </span>
        <span class="text-xs opacity-70">Modo</span>
      </button>
    </div>
  </aside>

  <!-- Menu button for mobile -->
  <button
    class="fixed bottom-4 left-4 z-50 sm:hidden p-3 rounded-lg bg-red-600 text-white shadow-lg cursor-pointer"
    @click="open = !open"
    aria-label="Abrir menú"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  </button>
</template>
