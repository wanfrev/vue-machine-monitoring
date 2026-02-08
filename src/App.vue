<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted, watch, computed } from "vue";
import { useRoute } from "vue-router";
import AppBottomNav from "@/components/AppBottomNav.vue";

const darkMode = ref(false);
provide("darkMode", darkMode);

const route = useRoute();
const showBottomNav = computed(() => {
  if (route.name === "login") return false;
  return !!route.meta.requiresAuth;
});

function applyHtmlDarkClass(isDark: boolean) {
  try {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  } catch (e) {
    // Ignorar si no hay document (por seguridad en entornos no-browser)
  }
}

onMounted(() => {
  // Inicializar modo oscuro desde preferencia guardada o del sistema
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme === "dark") {
    darkMode.value = true;
  } else if (storedTheme === "light") {
    darkMode.value = false;
  } else if (window.matchMedia) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
    darkMode.value = prefersDark.matches;
  }

  applyHtmlDarkClass(darkMode.value);
});

watch(darkMode, (value) => {
  localStorage.setItem("theme", value ? "dark" : "light");
  applyHtmlDarkClass(value);
});
</script>

<template>
  <div
    :class="[
      'min-h-screen font-sans',
      darkMode
        ? 'dark bg-zinc-950 text-zinc-100'
        : 'bg-slate-50 text-slate-900',
    ]"
  >
    <div :class="showBottomNav ? 'pb-20' : ''">
      <router-view />
    </div>
    <AppBottomNav v-if="showBottomNav" />
  </div>
</template>
