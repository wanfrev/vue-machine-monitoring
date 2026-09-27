<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import { useCurrentUser } from "@/composables/useCurrentUser";

// Cada rol descarga solo su dashboard (antes se cargaban los tres).
const AdminDashboardView = defineAsyncComponent(
  () => import("@/views/AdminDashboardView.vue")
);
const SupervisorDashboardView = defineAsyncComponent(
  () => import("@/views/SupervisorDashboardView.vue")
);
const OperatorDashboardView = defineAsyncComponent(
  () => import("@/views/OperatorDashboardView.vue")
);

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
