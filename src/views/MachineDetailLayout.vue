<script setup lang="ts">
import { computed } from "vue";
import { useCurrentUser } from "@/composables/useCurrentUser";
import AdminMachineDetailLayout from "@/views/AdminMachineDetailLayout.vue";
import OperatorMachineDetailLayout from "@/views/OperatorMachineDetailLayout.vue";
import SupervisorMachineDetailLayout from "@/views/SupervisorMachineDetailLayout.vue";

const { roleKind } = useCurrentUser();

const roleComponent = computed(() => {
  if (roleKind.value === "admin") return AdminMachineDetailLayout;
  if (roleKind.value === "supervisor") return SupervisorMachineDetailLayout;
  return OperatorMachineDetailLayout;
});
</script>

<template>
  <component :is="roleComponent" />
</template>
