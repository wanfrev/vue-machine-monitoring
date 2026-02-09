<script setup lang="ts">
import { computed } from "vue";
import MachineDetailLayoutBase from "@/views/MachineDetailLayoutBase.vue";
import { useCurrentUser } from "@/composables/useCurrentUser";

const { currentRole, assignedMachineIds, capabilities } = useCurrentUser();

const canEditStatus = computed(() => capabilities.value.canEditMachineStatus);
const canViewDetailsTabs = computed(() => false);
</script>

<template>
  <MachineDetailLayoutBase
    :current-role="currentRole"
    :assigned-machine-ids="assignedMachineIds"
    :can-edit-status="canEditStatus"
    :can-view-details-tabs="canViewDetailsTabs"
  />
</template>
