<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import AppSidebar from "@/components/AppSidebar.vue";
import NewMachine from "@/components/NewMachine.vue";
import DashboardHeader from "@/components/DashboardHeader.vue";
import DashboardNotifications from "@/components/DashboardNotifications.vue";
import DashboardSearchFilters from "@/components/DashboardSearchFilters.vue";
import MachineCardsGrid from "@/components/MachineCardsGrid.vue";
import DashboardToast from "@/components/DashboardToast.vue";
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
import type { DashboardFilterKey, Machine, ToastType } from "@/types/dashboard";

// Datos del usuario autenticado desde localStorage
const { currentRole, assignedMachineIds, isOperator } = useCurrentUser();
const currentUserName = ref(localStorage.getItem("userName") || "usuario");

const router = useRouter();

const sidebarOpen = ref(false);
const newMachineOpen = ref(false);
const newMachineMode = ref<"create" | "edit">("create");
const machineToEdit = ref<Machine | null>(null);

const machines = ref<Machine[]>([]);
const isAdmin = ref(false);

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
} = useDashboardFilters({ scopedMachines });

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

async function refreshPage() {
  await loadDashboardData();
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
  router.push({ name: "machine-resumen", params: { id: machine.name }, query });
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
// Total de monedas recolectadas hoy (suma de `dailyCoinsByMachine`)
const totalCoinsToday = computed(() =>
  scopedMachines.value.reduce((sum, machine) => {
    return sum + (dailyCoinsByMachine.value[machine.id] || 0);
  }, 0)
);

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;

function shouldShowNotificationForMachine(machineId: string): boolean {
  return canAccessMachine({
    role: currentRole.value,
    assignedMachineIds: assignedMachineIds.value,
    machineId: String(machineId),
    // NOTE: for notifications we only enforce assignment, not current status.
  });
}

const { startRealtime, stopRealtime } = useRealtimeEvents({
  currentRole,
  machines,
  coinsByMachine,
  dailyCoinsByMachine,
  shouldShowNotificationForMachine,
  addDashboardNotification,
  loadDashboardData,
});
// Nota: se mantiene formato absoluto (fecha y hora exacta)
// para los eventos, usando formatLastTime más abajo en la plantilla.

function getCurrentUserRole(): string | null {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    return (
      payload.role ||
      payload.jobRole ||
      payload.userRole ||
      payload["role"] ||
      null
    );
  } catch (e) {
    console.error("No se pudo decodificar el token JWT:", e);
    return null;
  }
}

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
  isAdmin.value =
    getCurrentUserRole() === "admin" || currentRole.value === "admin";
  await loadDashboardData();

  await startRealtime();

  await initNotifications();

  // Recarga automática del dashboard cada 15 segundos
  refreshTimer = window.setInterval(() => {
    loadDashboardData();
  }, 15000);
});

onUnmounted(() => {
  if (refreshTimer !== undefined) {
    clearInterval(refreshTimer);
  }
  window.removeEventListener("click", handleGlobalClick, true);
  stopRealtime();
});
</script>

<template>
  <AppSidebar
    :open="sidebarOpen"
    :dark="isDark()"
    @close="sidebarOpen = false"
  />
  <NewMachine
    v-if="isAdmin"
    :open="newMachineOpen"
    :mode="newMachineMode"
    :machine-to-edit="machineToEdit || undefined"
    :count="machines.length"
    :machines="machines"
    :dark="isDark()"
    @close="closeNewMachine"
    @create="handleNewMachine"
    @update="handleUpdateMachine"
  />

  <DashboardToast :toast="toast" :dark="isDark()" @close="hideToast" />

  <!-- Notificaciones: icono y panel en el header -->

  <div
    :class="[
      'min-h-full px-3 py-4 sm:px-8 sm:py-6 space-y-6',
      isDark() ? 'bg-slate-900' : 'bg-slate-50',
    ]"
  >
    <DashboardHeader
      :current-user-name="currentUserName"
      :total-machines="totalMachines"
      :active-machines="activeMachines"
      :inactive-machines="inactiveMachines"
      :total-coins-today="totalCoinsToday"
      :is-operator="isOperator"
      :dark="isDark()"
      @open-sidebar="sidebarOpen = true"
      @refresh="refreshPage"
    />

    <DashboardSearchFilters
      :search-query="searchQuery"
      :selected-filter="selectedFilter"
      :visible-state-filters="visibleStateFilters"
      :available-locations="availableLocations"
      :unread-count="unreadCount"
      :dark="isDark()"
      @update:search-query="updateSearchQuery"
      @select-filter="setSelectedFilterWithNotifications"
      @apply-filters="applyFilters"
    />

    <DashboardNotifications
      v-if="selectedFilter === 'notificaciones'"
      :dark="isDark()"
      :is-today-only="isTodayOnly"
      :notification-from="notificationFrom"
      :notification-to="notificationTo"
      :visible-notifications="visibleNotifications"
      :paged-notifications="pagedNotifications"
      :notification-page="notificationPage"
      :notification-total-pages="notificationTotalPages"
      @update:is-today-only="(value) => (isTodayOnly = value)"
      @update:notification-from="(value) => (notificationFrom = value)"
      @update:notification-to="(value) => (notificationTo = value)"
      @update:notification-page="(value) => (notificationPage = value)"
      @apply-today="
        () => {
          isTodayOnly = true;
          notificationFrom = null;
          notificationTo = null;
          loadNotificationsFromServer(1);
        }
      "
      @apply-range="
        () => {
          isTodayOnly = false;
          loadNotificationsFromServer(1);
        }
      "
    />
    <MachineCardsGrid
      v-else
      :machines="filteredMachines"
      :is-dark="isDark()"
      :is-admin="isAdmin"
      :is-operator="isOperator"
      :status-menu-open-id="statusMenuOpenId"
      :coins-by-machine="coinsByMachine"
      :daily-coins-by-machine="dailyCoinsByMachine"
      :weekly-coins-by-machine="weeklyCoinsByMachine"
      :first-on-today-by-machine="firstOnTodayByMachine"
      @select-machine="goToMachine"
      @toggle-status-menu="toggleStatusMenu"
      @toggle-maintenance="toggleMaintenance"
      @toggle-test-mode="toggleTestMode"
    />
  </div>
</template>
