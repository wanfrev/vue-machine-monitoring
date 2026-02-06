import { watch, type Ref } from "vue";

export function useBodyScrollLock(isOpen: Ref<boolean>): void {
  watch(
    isOpen,
    (open) => {
      if (open) {
        document.body.classList.add("overflow-hidden");
      } else {
        document.body.classList.remove("overflow-hidden");
      }
    },
    { immediate: true }
  );
}
