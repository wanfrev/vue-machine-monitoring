import { inject, computed, type Ref } from "vue";

export function useTheme() {
  const injectedDark = inject<Ref<boolean> | boolean>("darkMode", false);
  const isDark = computed(() => {
    if (typeof injectedDark === "boolean") return injectedDark;
    return !!injectedDark?.value;
  });

  return { isDark };
}
