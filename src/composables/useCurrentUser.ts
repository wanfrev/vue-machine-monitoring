import { ref, computed } from "vue";
import { getAssignedMachineIdsFromStorage } from "@/utils/access";

export function useCurrentUser() {
  const currentRole = ref(localStorage.getItem("role") || "");
  const assignedMachineIds = ref<string[]>(getAssignedMachineIdsFromStorage());

  const isAdmin = computed(() => currentRole.value === "admin");
  const isOperator = computed(
    () => currentRole.value === "operator" || currentRole.value === "employee"
  );

  return {
    currentRole,
    assignedMachineIds,
    isAdmin,
    isOperator,
  };
}
