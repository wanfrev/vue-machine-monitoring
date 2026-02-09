<script setup lang="ts">
import { computed } from "vue";
import { useCurrentUser } from "@/composables/useCurrentUser";
import AdminReportsView from "@/views/AdminReportsView.vue";
import OperatorReportsView from "@/views/OperatorReportsView.vue";
import SupervisorReportsView from "@/views/SupervisorReportsView.vue";

const { roleKind } = useCurrentUser();

const roleComponent = computed(() => {
  if (roleKind.value === "admin") return AdminReportsView;
  if (roleKind.value === "supervisor") return SupervisorReportsView;
  return OperatorReportsView;
});
</script>

<template>
  <component :is="roleComponent" />
</template>
