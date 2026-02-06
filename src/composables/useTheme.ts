import { inject, computed, type Ref } from "vue";

export function useTheme() {
  const injectedDark = inject<Ref<boolean> | boolean>("darkMode", false);

  const isDark = computed(() => {
    if (typeof injectedDark === "boolean") return injectedDark;
    return !!injectedDark?.value;
  });

  function setDarkMode(value: boolean) {
    if (typeof injectedDark !== "boolean" && injectedDark) {
      (injectedDark as Ref<boolean>).value = value;
    }
  }

  function toggleDarkMode() {
    setDarkMode(!isDark.value);
  }

  return { isDark, setDarkMode, toggleDarkMode };
}
