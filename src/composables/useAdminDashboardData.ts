import { useDashboardBaseData } from "@/composables/useDashboardBaseData";

export function useAdminDashboardData() {
  return useDashboardBaseData("admin");
}
