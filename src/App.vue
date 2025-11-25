<script setup lang="ts">
import { ref, provide } from "vue";
import SidebarDashboard from "./components/SidebarDashboard.vue";

const darkMode = ref(false);
provide("darkMode", darkMode);
</script>

<template>
  <div
    :class="[
      'relative min-h-screen flex flex-row',
      darkMode ? 'dark bg-slate-900 text-white' : 'bg-white text-slate-900',
    ]"
  >
    <SidebarDashboard @toggle-dark="darkMode = !darkMode" />
    <main
      :class="[
        'flex-1 min-w-0',
        darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900',
      ]"
    >
      <router-view />
    </main>
  </div>
</template>
