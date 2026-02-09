import { useDashboardBaseData } from "@/composables/useDashboardBaseData";

export function useOperatorDashboardData() {
  return useDashboardBaseData("operator");
}
