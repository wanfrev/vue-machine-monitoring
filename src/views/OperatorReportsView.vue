<script setup lang="ts">
import ReportsViewBase from "@/views/ReportsViewBase.vue";
import { useCurrentUser } from "@/composables/useCurrentUser";

const { roleKind, assignedMachineIds } = useCurrentUser();
const canViewReportsList = false;
</script>

<template>
  <ReportsViewBase
    :can-view-reports-list="canViewReportsList"
    :role-kind="roleKind"
    :assigned-machine-ids="assignedMachineIds"
  />
</template>
