<script setup lang="ts">
import { computed } from "vue";
import { useCurrentUser } from "@/composables/useCurrentUser";
import AdminMachinesView from "@/views/AdminMachinesView.vue";
import OperatorMachinesView from "@/views/OperatorMachinesView.vue";
import SupervisorMachinesView from "@/views/SupervisorMachinesView.vue";

const { roleKind } = useCurrentUser();

const roleComponent = computed(() => {
  if (roleKind.value === "admin") return AdminMachinesView;
  if (roleKind.value === "supervisor") return SupervisorMachinesView;
  return OperatorMachinesView;
});
</script>

<template>
  <component :is="roleComponent" />
</template>
