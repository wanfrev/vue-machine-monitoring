<script setup lang="ts">
import ReportsViewBase from "@/views/ReportsViewBase.vue";
import { useCurrentUser } from "@/composables/useCurrentUser";

const { roleKind, assignedMachineIds, canViewReportsList } = useCurrentUser();
</script>

<template>
  <ReportsViewBase
    :can-view-reports-list="canViewReportsList"
    :role-kind="roleKind"
    :assigned-machine-ids="assignedMachineIds"
    report-kind-label="diario"
    report-kind-plural="diarios"
    :show-tabs="canViewReportsList"
    active-tab="daily"
  />
</template>
