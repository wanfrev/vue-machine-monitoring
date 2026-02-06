import { ref, computed, type Ref } from "vue";
import type {
  DashboardFilterKey,
  DashboardFilters,
  Machine,
} from "@/types/dashboard";

type UseDashboardFiltersOptions = {
  scopedMachines: Ref<Machine[]>;
};

export function useDashboardFilters(options: UseDashboardFiltersOptions) {
  const searchQuery = ref("");
  const dashboardFilters = ref<DashboardFilters>({ locations: [] });
  const selectedFilter = ref<DashboardFilterKey>("todas");

  const visibleStateFilters = computed<DashboardFilterKey[]>(() => [
    "todas",
    "activas",
    "inactivas",
    "mantenimiento",
  ]);

  const availableLocations = computed(() => {
    const set = new Set<string>();
    for (const m of options.scopedMachines.value) {
      const loc = (m.location ?? "").trim();
      if (loc) set.add(loc);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  const filteredMachines = computed(() => {
    let baseMachines = options.scopedMachines.value.slice().sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? "", "es", {
        sensitivity: "base",
      })
    );

    if (selectedFilter.value === "activas") {
      baseMachines = baseMachines.filter((m) => m.status === "active");
    } else if (selectedFilter.value === "inactivas") {
      baseMachines = baseMachines.filter((m) => m.status === "inactive");
    } else if (selectedFilter.value === "mantenimiento") {
      baseMachines = baseMachines.filter((m) => m.status === "maintenance");
    }

    const q = searchQuery.value.trim().toLowerCase();
    if (q) {
      baseMachines = baseMachines.filter((m) => {
        const hay = `${m.name ?? ""} ${m.location ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const f = dashboardFilters.value;
    if (f.locations.length) {
      const set = new Set(f.locations);
      baseMachines = baseMachines.filter((m) =>
        set.has((m.location ?? "").trim())
      );
    }

    return baseMachines;
  });

  function setSelectedFilter(filter: DashboardFilterKey) {
    selectedFilter.value = filter;
  }

  function updateSearchQuery(value: string) {
    searchQuery.value = value;
  }

  function applyFilters(payload: DashboardFilters) {
    dashboardFilters.value = payload;
  }

  return {
    searchQuery,
    dashboardFilters,
    selectedFilter,
    visibleStateFilters,
    availableLocations,
    filteredMachines,
    setSelectedFilter,
    updateSearchQuery,
    applyFilters,
  };
}
