<script setup lang="ts">
import { computed } from "vue";
import { useCurrentUser } from "@/composables/useCurrentUser";
import MachineDetailView from "@/views/MachineDetailView.vue";
import OperatorMachineDetailLayout from "@/views/OperatorMachineDetailLayout.vue";

const { roleKind } = useCurrentUser();

const roleComponent = computed(() =>
  roleKind.value === "operator"
    ? OperatorMachineDetailLayout
    : MachineDetailView
);
</script>

<template>
  <component :is="roleComponent" />
</template>
