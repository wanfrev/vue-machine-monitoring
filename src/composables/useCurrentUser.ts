import { ref, computed } from "vue";
import {
  canSeeManagement,
  canViewReports,
  getAssignedMachineIdsFromStorage,
  getRoleLabel,
  resolveRoleKind,
} from "@/utils/access";
import { getRoleCapabilities } from "@/permissions/roleCapabilities";

export function useCurrentUser() {
  const currentRole = ref(localStorage.getItem("role") || "");
  const currentJobRole = ref(localStorage.getItem("jobRole") || "");
  const assignedMachineIds = ref<string[]>(getAssignedMachineIdsFromStorage());

  const roleKind = computed(() =>
    resolveRoleKind(currentRole.value, currentJobRole.value)
  );

  const isAdmin = computed(() => roleKind.value === "admin");
  const isSupervisor = computed(() => roleKind.value === "supervisor");
  const isOperator = computed(() => roleKind.value === "operator");
  const roleLabel = computed(() =>
    getRoleLabel(currentRole.value, currentJobRole.value)
  );
  const capabilities = computed(() => getRoleCapabilities(roleKind.value));
  const canManage = computed(() => canSeeManagement(roleKind.value));
  const canViewReportsList = computed(() => canViewReports(roleKind.value));

  return {
    currentRole,
    currentJobRole,
    assignedMachineIds,
    roleKind,
    roleLabel,
    capabilities,
    isAdmin,
    isOperator,
    isSupervisor,
    canManage,
    canViewReportsList,
  };
}
