<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCurrentUser } from "@/composables/useCurrentUser";
import { useTheme } from "@/composables/useTheme";

const router = useRouter();
const route = useRoute();
const { currentRole } = useCurrentUser();
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
  ];

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
      >
        <span
          class="h-1.5 w-1.5 rounded-full"
          :class="
            isActive(item.name)
              ? isDark()
                ? 'bg-emerald-400'
                : 'bg-slate-900'
              : 'bg-transparent'
          "
        ></span>
        <span>{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>

<style scoped></style>
