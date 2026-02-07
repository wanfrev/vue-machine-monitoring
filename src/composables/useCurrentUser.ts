import { ref, computed } from "vue";
import { getAssignedMachineIdsFromStorage } from "@/utils/access";

export function useCurrentUser() {
  const currentRole = ref(localStorage.getItem("role") || "");
  const currentJobRole = ref(localStorage.getItem("jobRole") || "");
  const assignedMachineIds = ref<string[]>(getAssignedMachineIdsFromStorage());

  const isSupervisor = computed(() => {
    const jr = String(currentJobRole.value || "").toLowerCase();
    return jr.includes("supervisor");
  });

  const isAdmin = computed(() => currentRole.value === "admin");
  // Legacy naming: isOperator is used throughout the app to mean "non-admin".
  // Supervisors should see admin-style UI, so treat them as non-operators.
  const isOperator = computed(
    () => currentRole.value === "employee" && !isSupervisor.value
  );

  return {
    currentRole,
    currentJobRole,
    assignedMachineIds,
    isAdmin,
    isOperator,
    isSupervisor,
  };
}
