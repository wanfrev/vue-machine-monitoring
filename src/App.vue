<script setup lang="ts">
import { ref, provide } from "vue";

const darkMode = ref(false);
provide("darkMode", darkMode);
</script>

<template>
  <div
    :class="[
      'min-h-screen font-sans',
      darkMode ? 'dark bg-slate-900 text-white' : 'bg-white text-slate-900',
    ]"
  >
    <router-view />
  </div>
</template>
