<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted, watch, computed } from "vue";
import { useRoute } from "vue-router";
import AppBottomNav from "@/components/AppBottomNav.vue";
import UpdateAvailableBanner from "@/components/UpdateAvailableBanner.vue";
import { resolveRoleKind } from "@/utils/access";

const route = useRoute();
const showFloatingNav = computed(() => {
  void route.fullPath;
  if (!route.meta?.requiresAuth) return false;
  const kind = resolveRoleKind(
    localStorage.getItem("role") || "",
    localStorage.getItem("jobRole") || ""
  );
  return kind !== "operator";
});

const darkMode = ref(false);
provide("darkMode", darkMode);

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
      showFloatingNav ? 'pb-28' : '',
      darkMode
        ? 'dark bg-zinc-950 text-zinc-100'
        : 'bg-slate-50 text-slate-900',
    ]"
  >
    <router-view />
    <AppBottomNav v-if="showFloatingNav" />
    <UpdateAvailableBanner />
  </div>
</template>
