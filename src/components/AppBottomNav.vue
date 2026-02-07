<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCurrentUser } from "@/composables/useCurrentUser";
import { useTheme } from "@/composables/useTheme";

const router = useRouter();
const route = useRoute();
const { currentRole, isSupervisor } = useCurrentUser();
const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;

function isActive(name: string) {
  return String(route.name || "") === name;
}

const items = computed(() => {
  const base = [
    {
      name: "dashboard",
      label: "Inicio",
    },
    {
      name: "machines",
      label: "Maquinas",
    },
    {
      name: "reports",
      label: "Reportes",
    },
  ];

  // Ventas diarias solo aplica a empleados no-supervisores.
  if (currentRole.value !== "admin" && !isSupervisor.value) {
    base.splice(2, 0, { name: "daily-sales", label: "Ventas" });
  }

  if (currentRole.value === "admin") {
    base.push({ name: "employees", label: "Personal" });
  }

  base.push({ name: "profile", label: "Perfil" });

  return base;
});
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl lg:hidden"
    :class="
      isDark()
        ? 'border-zinc-800/70 bg-zinc-950/70 text-zinc-200'
        : 'border-slate-200/80 bg-white/80 text-slate-600'
    "
    aria-label="Navegacion inferior"
  >
    <div class="mx-auto flex max-w-lg items-center justify-around px-4 py-2">
      <button
        v-for="item in items"
        :key="item.name"
        type="button"
        class="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition"
        :class="
          isActive(item.name)
            ? isDark()
              ? 'text-white'
              : 'text-slate-900'
            : isDark()
            ? 'text-zinc-400'
            : 'text-slate-500'
        "
        @click="router.push({ name: item.name })"
        :aria-label="item.label"
      >
        <!-- Icon map: simple inline SVGs for compact bottom nav -->
        <svg
          v-if="item.name === 'dashboard'"
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M3 13h1v7c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-7h1c.4 0 .77-.24.92-.62.15-.37.07-.8-.22-1.09l-8.99-9a.996.996 0 0 0-1.41 0l-9.01 9c-.29.29-.37.72-.22 1.09s.52.62.92.62Zm9-8.59 6 6V20H6v-9.59z"
          ></path>
        </svg>

        <svg
          v-else-if="item.name === 'machines'"
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M8.5 10a1.5 2 0 1 0 0 4 1.5 2 0 1 0 0-4m7 0a1.5 2 0 1 0 0 4 1.5 2 0 1 0 0-4M8 16h8v2H8z"
          ></path>
          <path
            d="M21 11V8c0-1.1-.9-2-2-2h-6V4.61c.3-.27.5-.67.5-1.11 0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5c0 .44.2.84.5 1.11V6H5c-1.1 0-2 .9-2 2v3c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1v3c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-3c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1M5 20V8h14v12z"
          ></path>
        </svg>

        <svg
          v-else-if="item.name === 'reports'"
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="m19.94 7.68-.03-.09a.8.8 0 0 0-.2-.29l-5-5a1 1 0 0 0-.3-.2l-.09-.03a.9.9 0 0 0-.27-.05c-.02 0-.04-.01-.05-.01H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-12s-.01-.04-.01-.06c0-.09-.02-.17-.05-.26ZM6 20V4h7v4c0 .55.45 1 1 1h4v11z"
          ></path>
          <path d="M8 12h2v6H8zm3-2h2v8h-2zm3 4h2v4h-2z"></path>
        </svg>

        <svg
          v-else-if="item.name === 'daily-sales'"
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M12 2C9.24 2 7 4.24 7 7v1H4c-.55 0-1 .45-1 1v11c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V9c0-.55-.45-1-1-1h-3V7c0-2.76-2.24-5-5-5M9 7c0-1.65 1.35-3 3-3s3 1.35 3 3v1H9zm10 3v10H5V10z"
          ></path>
        </svg>

        <svg
          v-else-if="item.name === 'employees'"
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M19 2H5c-.55 0-1 .45-1 1v4H2v2h2v2H2v2h2v2H2v2h2v4c0 .55.45 1 1 1h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 18H6V4h13z"
          ></path>
          <path
            d="M12.5 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5m4.5 9c0-1.66-1.34-3-3-3h-3c-1.66 0-3 1.34-3 3v1h9z"
          ></path>
        </svg>

        <svg
          v-else-if="item.name === 'profile'"
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M12 6c-2.28 0-4 1.72-4 4s1.72 4 4 4 4-1.72 4-4-1.72-4-4-4m0 6c-1.18 0-2-.82-2-2s.82-2 2-2 2 .82 2 2-.82 2-2 2"
          ></path>
          <path
            d="M12 2C6.49 2 2 6.49 2 12c0 3.26 1.58 6.16 4 7.98V20h.03c1.67 1.25 3.73 2 5.97 2s4.31-.75 5.97-2H18v-.02c2.42-1.83 4-4.72 4-7.98 0-5.51-4.49-10-10-10M8.18 19.02C8.59 17.85 9.69 17 11 17h2c1.31 0 2.42.85 2.82 2.02-1.14.62-2.44.98-3.82.98s-2.69-.35-3.82-.98m9.3-1.21c-.81-1.66-2.51-2.82-4.48-2.82h-2c-1.97 0-3.66 1.16-4.48 2.82A7.96 7.96 0 0 1 4 11.99c0-4.41 3.59-8 8-8s8 3.59 8 8c0 2.29-.97 4.36-2.52 5.82"
          ></path>
        </svg>

        <!-- Label under icon -->
        <span class="text-[10px] leading-3 mt-0.5">{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>

<style scoped></style>
