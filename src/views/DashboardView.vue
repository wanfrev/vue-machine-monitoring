<script setup lang="ts">
import { computed } from "vue";
import AdminDashboardView from "@/views/AdminDashboardView.vue";
import SupervisorDashboardView from "@/views/SupervisorDashboardView.vue";
import OperatorDashboardView from "@/views/OperatorDashboardView.vue";
import { useCurrentUser } from "@/composables/useCurrentUser";

const { currentRole, isSupervisor } = useCurrentUser();

const roleComponent = computed(() => {
  if (currentRole.value === "admin") return AdminDashboardView;
  if (isSupervisor.value) return SupervisorDashboardView;
  return OperatorDashboardView;
});
</script>

<template>
  <component :is="roleComponent" />
</template>
