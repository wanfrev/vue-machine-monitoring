<script setup lang="ts">
import { computed } from "vue";
import MachinesViewBase from "@/views/MachinesViewBase.vue";
import { useCurrentUser } from "@/composables/useCurrentUser";

const { currentRole, assignedMachineIds, capabilities } = useCurrentUser();

const canSeeEmployees = computed(() => capabilities.value.canManageEmployees);
const canEditMachines = computed(() => capabilities.value.canEditMachines);
const canEditCoinValues = computed(() => capabilities.value.canEditCoinValues);
const canEditExchangeRate = computed(
  () => capabilities.value.canEditExchangeRate
);
</script>

<template>
  <MachinesViewBase
    :current-role="currentRole"
    :assigned-machine-ids="assignedMachineIds"
    :can-see-employees="canSeeEmployees"
    :can-edit-machines="canEditMachines"
    :can-edit-coin-values="canEditCoinValues"
    :can-edit-exchange-rate="canEditExchangeRate"
  />
</template>
