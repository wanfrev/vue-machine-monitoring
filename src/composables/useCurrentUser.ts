import { ref, computed } from "vue";
import { getAssignedMachineIdsFromStorage } from "@/utils/access";

export function useCurrentUser() {
  const currentRole = ref(localStorage.getItem("role") || "");
  const currentJobRole = ref(localStorage.getItem("jobRole") || "");
  const assignedMachineIds = ref<string[]>(getAssignedMachineIdsFromStorage());

  const isAdmin = computed(() => currentRole.value === "admin");
  // Legacy naming: isOperator is used throughout the app to mean "non-admin".
  const isOperator = computed(() => currentRole.value === "employee");

  const isSupervisor = computed(() => {
    const jr = String(currentJobRole.value || "").toLowerCase();
    return jr.includes("supervisor");
  });

  return {
    currentRole,
    currentJobRole,
    assignedMachineIds,
    isAdmin,
    isOperator,
    isSupervisor,
  };
}
