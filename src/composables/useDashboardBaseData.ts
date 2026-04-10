import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useDashboardNotifications } from "@/composables/useDashboardNotifications";
import { useMachineUsage } from "@/composables/useMachineUsage";
import { useRealtimeEvents } from "@/composables/useRealtimeEvents";
import { useMachineData } from "@/composables/useMachineData";
import { useMachineActions } from "@/composables/useMachineActions";
import { useDashboardFilters } from "@/composables/useDashboardFilters";
import { useCurrentUser } from "@/composables/useCurrentUser";
import { useTheme } from "@/composables/useTheme";
import { canAccessMachine, filterMachinesForRole } from "@/utils/access";
import { machineStatusLabel } from "@/utils/machine";
import { getTodayLocalStr } from "@/utils/date";
import { getDailySaleEntries, getMyOperatorCoinBalance } from "@/api/client";
import type { DashboardFilterKey, Machine, ToastType } from "@/types/dashboard";

type DashboardMode = "admin" | "supervisor" | "operator";

const OPERATOR_REMAINING_COINS_STORAGE_KEY = "operatorRemainingCoins";

function getStoredOperatorRemainingCoins(): number {
  try {
    const raw = localStorage.getItem(OPERATOR_REMAINING_COINS_STORAGE_KEY);
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.trunc(parsed);
    }
  } catch {
    // ignore storage errors
  }
  return 200;
}

function setStoredOperatorRemainingCoins(value: number): void {
  try {
    localStorage.setItem(
      OPERATOR_REMAINING_COINS_STORAGE_KEY,
      String(Math.max(0, Math.trunc(value)))
    );
  } catch {
    // ignore storage errors
  }
}

export function useDashboardBaseData(mode: DashboardMode) {
  const { currentRole, assignedMachineIds } = useCurrentUser();
  const isOperator = computed(() => mode === "operator");
  const isAdmin = computed(() => mode === "admin");
  const canViewNotifications = computed(() => !isOperator.value);

  const currentUserName = ref(localStorage.getItem("userName") || "usuario");

  const router = useRouter();

  const sidebarOpen = ref(false);
  const newMachineOpen = ref(false);
  const newMachineMode = ref<"create" | "edit">("create");
  const machineToEdit = ref<Machine | null>(null);

  const machines = ref<Machine[]>([]);
  const statusMenuOpenId = ref<string | null>(null);

  const scopedMachines = computed(() =>
    filterMachinesForRole(machines.value, {
      role: currentRole.value,
      assignedMachineIds: assignedMachineIds.value,
    })
  );

  const {
    searchQuery,
    selectedFilter,
    visibleStateFilters,
    availableLocations,
    filteredMachines,
    setSelectedFilter,
    updateSearchQuery,
    applyFilters,
  } = useDashboardFilters({
    scopedMachines,
    preferBoxeoFirst: isOperator,
  });

  const toast = ref<{ title: string; body?: string; type: ToastType } | null>(
    null
  );
  let toastTimer: number | undefined;

  function showToast(
    title: string,
    body?: string,
    type: ToastType = "event",
    duration = 3000
  ) {
    toast.value = { title, body, type };
    if (toastTimer) window.clearTimeout(toastTimer);
    if (duration > 0) {
      toastTimer = window.setTimeout(() => {
        toast.value = null;
      }, duration);
    }
  }

  function hideToast() {
    if (toastTimer) window.clearTimeout(toastTimer);
    toast.value = null;
  }

  function refreshPage() {
    window.location.reload();
  }

  function setSelectedFilterWithNotifications(filter: DashboardFilterKey) {
    setSelectedFilter(filter);
    if (filter === "notificaciones") {
      markNotificationsSeen();
    }
  }

  function goToMachine(machine: Machine) {
    const query: Record<string, string> = {
      status: machineStatusLabel(machine.status),
    };
    if (machine.location) query.location = machine.location;
    router.push({
      name: "machine-resumen",
      params: { id: machine.name },
      query,
    });
  }

  const { firstOnTodayByMachine, ensureUsageDataFresh } =
    useMachineUsage(scopedMachines);

  const {
    coinsByMachine,
    dailyCoinsByMachine,
    weeklyCoinsByMachine,
    loadDashboardData,
  } = useMachineData({
    machines,
    scopedMachines,
    ensureUsageDataFresh,
    onUnauthorized: () => {
      router.push({ name: "login" });
    },
  });

  const {
    closeNewMachine,
    handleNewMachine,
    handleUpdateMachine,
    toggleStatusMenu,
    toggleMaintenance,
    toggleTestMode,
  } = useMachineActions({
    machines,
    isAdmin,
    statusMenuOpenId,
    newMachineOpen,
    newMachineMode,
    machineToEdit,
    loadDashboardData,
    showToast,
  });

  const totalMachines = computed(() => scopedMachines.value.length);
  const activeMachines = computed(
    () => scopedMachines.value.filter((m) => m.status === "active").length
  );
  const inactiveMachines = computed(
    () => totalMachines.value - activeMachines.value
  );
  const totalCoinsToday = computed(() =>
    scopedMachines.value.reduce((sum, machine) => {
      return sum + (dailyCoinsByMachine.value[machine.id] || 0);
    }, 0)
  );

  const totalOperatorEntriesCoins = ref(0);
  const operatorRemainingCoins = ref(getStoredOperatorRemainingCoins());

  async function loadOperatorEntriesTotal() {
    if (!isOperator.value) {
      totalOperatorEntriesCoins.value = 0;
      return;
    }

    try {
      const today = getTodayLocalStr();
      const entries = await getDailySaleEntries({
        startDate: today,
        endDate: today,
      });
      const rows = Array.isArray(entries) ? entries : [];
      totalOperatorEntriesCoins.value = rows.reduce((sum, row) => {
        const coins = Number((row as { coins?: number | string })?.coins ?? 0);
        return Number.isFinite(coins) ? sum + coins : sum;
      }, 0);
    } catch {
      totalOperatorEntriesCoins.value = 0;
    }
  }

  async function loadOperatorRemainingCoins() {
    if (!isOperator.value) {
      operatorRemainingCoins.value = 200;
      return;
    }

    try {
      const result = await getMyOperatorCoinBalance();
      const remaining = Number(
        result?.remainingCoins ?? operatorRemainingCoins.value
      );
      operatorRemainingCoins.value = Number.isFinite(remaining)
        ? Math.max(0, Math.trunc(remaining))
        : operatorRemainingCoins.value;
      setStoredOperatorRemainingCoins(operatorRemainingCoins.value);
    } catch {
      // Keep last known value to avoid fake resets in UI.
    }
  }

  function handleOperatorSaleLogged(event: Event) {
    if (!isOperator.value) return;
    const custom = event as CustomEvent<{ coins?: number }>;
    const rawCoins = Number(custom.detail?.coins ?? 0);
    const coins = Number.isFinite(rawCoins)
      ? Math.max(0, Math.trunc(rawCoins))
      : 0;
    if (!coins) return;

    totalOperatorEntriesCoins.value += coins;
    operatorRemainingCoins.value = Math.max(
      0,
      operatorRemainingCoins.value - coins
    );
    setStoredOperatorRemainingCoins(operatorRemainingCoins.value);
  }

  const { isDark: isDarkRef } = useTheme();
  const isDark = () => isDarkRef.value;

  function shouldShowNotificationForMachine(machineId: string): boolean {
    return canAccessMachine({
      role: currentRole.value,
      assignedMachineIds: assignedMachineIds.value,
      machineId: String(machineId),
    });
  }

  const {
    unreadCount,
    isTodayOnly,
    notificationFrom,
    notificationTo,
    notificationPage,
    notificationTotalPages,
    visibleNotifications,
    pagedNotifications,
    addDashboardNotification,
    loadNotificationsFromServer,
    markNotificationsSeen,
    initNotifications,
  } = useDashboardNotifications({
    selectedFilter,
    shouldShowNotificationForMachine,
    showToast,
  });

  const { startRealtime, stopRealtime } = useRealtimeEvents({
    currentRole,
    machines,
    coinsByMachine,
    dailyCoinsByMachine,
    shouldShowNotificationForMachine,
    addDashboardNotification,
    loadDashboardData,
  });

  function handleGlobalClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const insideStatus = target.closest("[data-status-menu]");
    if (!insideStatus) {
      statusMenuOpenId.value = null;
    }
  }

  let refreshTimer: number | undefined;
  onMounted(async () => {
    window.addEventListener("click", handleGlobalClick, true);
    window.addEventListener("operator-sale-logged", handleOperatorSaleLogged);
    await loadDashboardData();
    await loadOperatorEntriesTotal();
    await loadOperatorRemainingCoins();

    await startRealtime();

    if (canViewNotifications.value) {
      await initNotifications();
    }

    refreshTimer = window.setInterval(() => {
      loadDashboardData();
      void loadOperatorEntriesTotal();
      void loadOperatorRemainingCoins();
    }, 15000);
  });

  onUnmounted(() => {
    if (refreshTimer !== undefined) {
      clearInterval(refreshTimer);
    }
    window.removeEventListener("click", handleGlobalClick, true);
    window.removeEventListener(
      "operator-sale-logged",
      handleOperatorSaleLogged
    );
    stopRealtime();
  });

  return {
    sidebarOpen,
    newMachineOpen,
    newMachineMode,
    machineToEdit,
    machines,
    statusMenuOpenId,
    currentUserName,
    isOperator,
    isAdmin,
    canViewNotifications,
    searchQuery,
    selectedFilter,
    visibleStateFilters,
    availableLocations,
    filteredMachines,
    unreadCount,
    isTodayOnly,
    notificationFrom,
    notificationTo,
    notificationPage,
    notificationTotalPages,
    visibleNotifications,
    pagedNotifications,
    coinsByMachine,
    dailyCoinsByMachine,
    weeklyCoinsByMachine,
    firstOnTodayByMachine,
    totalMachines,
    activeMachines,
    inactiveMachines,
    totalCoinsToday,
    totalOperatorEntriesCoins,
    operatorRemainingCoins,
    toast,
    isDark,
    closeNewMachine,
    handleNewMachine,
    handleUpdateMachine,
    hideToast,
    refreshPage,
    setSelectedFilterWithNotifications,
    updateSearchQuery,
    applyFilters,
    loadNotificationsFromServer,
    goToMachine,
    toggleStatusMenu,
    toggleMaintenance,
    toggleTestMode,
  };
}
