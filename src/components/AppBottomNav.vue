<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCurrentUser } from "@/composables/useCurrentUser";
import { useTheme } from "@/composables/useTheme";

const router = useRouter();
const route = useRoute();
const { capabilities } = useCurrentUser();
const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;

type NavItem = { name: string; icon: string; label: string; match: string[] };

const items = computed(() => {
  const list: NavItem[] = [
    {
      name: "dashboard",
      icon: "machines",
      label: "Máquinas",
      match: ["dashboard", "machine-resumen"],
    },
  ];
  if (capabilities.value.canManageEmployees) {
    list.push({
      name: "employees",
      icon: "employees",
      label: "Equipo",
      match: ["employees", "employee-report-detail", "report-detail"],
    });
  }
  if (capabilities.value.canSeeFinance) {
    list.push({
      name: "finance",
      icon: "finance",
      label: "Finanzas",
      match: ["finance"],
    });
  }
  list.push({
    name: "profile",
    icon: "profile",
    label: "Perfil",
    match: ["profile"],
  });
  return list;
});

function isActive(item: NavItem) {
  return item.match.includes(String(route.name || ""));
}
</script>

<template>
  <Teleport to="body">
    <nav
      class="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3"
      style="
        padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
        transform: translateZ(0);
      "
      aria-label="Navegación principal"
    >
      <div
        class="pointer-events-auto flex w-full max-w-md items-center justify-between gap-1 rounded-full border p-1.5 shadow-2xl backdrop-blur-xl"
        :class="
          isDark()
            ? 'border-zinc-700/60 bg-zinc-900/85'
            : 'border-slate-200 bg-white/90'
        "
      >
        <button
          v-for="item in items"
          :key="item.name"
          type="button"
          class="flex min-h-[3rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 text-[11px] font-medium transition"
          :class="
            isActive(item)
              ? isDark()
                ? 'bg-red-500/20 text-red-300'
                : 'bg-red-500/15 text-red-700'
              : isDark()
              ? 'text-zinc-400'
              : 'text-slate-500'
          "
          :aria-label="item.label"
          :aria-current="isActive(item) ? 'page' : undefined"
          @click="router.push({ name: item.name })"
        >
          <svg
            v-if="item.icon === 'machines'"
            class="h-5 w-5"
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
            v-else-if="item.icon === 'employees'"
            class="h-5 w-5"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M9 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4m0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m0 8c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4m-6 4c.22-.72 3.31-2 6-2s5.78 1.28 6 2zm13.05-8.78c.99.74 1.7 1.83 1.7 3.11s-.71 2.37-1.7 3.11c1.86-.36 3.95-1.5 3.95-3.11s-2.09-2.75-3.95-3.11M17.7 14.56c1.9.75 3.3 1.95 3.3 3.44v2h3v-2c0-1.89-3.05-3.36-6.3-3.44"
            ></path>
          </svg>
          <svg
            v-else-if="item.icon === 'finance'"
            class="h-5 w-5"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M12 3c-4.97 0-9 1.57-9 3.5S7.03 10 12 10s9-1.57 9-3.5S16.97 3 12 3"
            ></path>
            <path
              d="M3 10.5C3 12.43 7.03 14 12 14s9-1.57 9-3.5V8.6c-1.9 1.44-5.52 2.4-9 2.4s-7.1-.96-9-2.4z"
            ></path>
            <path
              d="M3 14.5C3 16.43 7.03 18 12 18s9-1.57 9-3.5v-1.9c-1.9 1.44-5.52 2.4-9 2.4s-7.1-.96-9-2.4z"
            ></path>
            <path
              d="M3 18.5C3 20.43 7.03 22 12 22s9-1.57 9-3.5v-1.9c-1.9 1.44-5.52 2.4-9 2.4s-7.1-.96-9-2.4z"
            ></path>
          </svg>
          <svg
            v-else
            class="h-5 w-5"
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
          <span>{{ item.label }}</span>
        </button>
      </div>
    </nav>
  </Teleport>
</template>
