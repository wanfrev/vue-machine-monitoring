import { useDashboardBaseData } from "@/composables/useDashboardBaseData";

export function useSupervisorDashboardData() {
  return useDashboardBaseData("supervisor");
}
