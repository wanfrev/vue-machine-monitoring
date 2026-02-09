<script setup lang="ts">
/* global defineProps */
import AppSidebar from "@/components/AppSidebar.vue";
import NewMachine from "@/components/NewMachine.vue";
import DashboardHeader from "@/components/DashboardHeader.vue";
import DashboardNotifications from "@/components/DashboardNotifications.vue";
import DashboardSearchFilters from "@/components/DashboardSearchFilters.vue";
import MachineCardsGrid from "@/components/MachineCardsGrid.vue";
import DashboardToast from "@/components/DashboardToast.vue";
import { useAdminDashboardData } from "@/composables/useAdminDashboardData";
import { useOperatorDashboardData } from "@/composables/useOperatorDashboardData";
import { useSupervisorDashboardData } from "@/composables/useSupervisorDashboardData";

type DashboardMode = "admin" | "supervisor" | "operator";

const props = defineProps<{
  mode: DashboardMode;
}>();

const dashboard =
  props.mode === "admin"
    ? useAdminDashboardData()
    : props.mode === "supervisor"
    ? useSupervisorDashboardData()
    : useOperatorDashboardData();

const {
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
} = dashboard;
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

  <div
    :class="[
      'min-h-full px-3 py-4 sm:px-8 sm:py-6 space-y-6',
      isDark() ? 'bg-zinc-950' : 'bg-slate-100',
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
      v-if="canViewNotifications"
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
      v-if="canViewNotifications && selectedFilter === 'notificaciones'"
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
