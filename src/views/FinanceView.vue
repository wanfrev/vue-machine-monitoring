<script setup lang="ts">
import { computed } from "vue";
import { useCurrentUser } from "@/composables/useCurrentUser";
import AdminFinanceView from "@/views/AdminFinanceView.vue";
import OperatorFinanceView from "@/views/OperatorFinanceView.vue";
import SupervisorFinanceView from "@/views/SupervisorFinanceView.vue";

const { roleKind } = useCurrentUser();

const roleComponent = computed(() => {
  if (roleKind.value === "admin") return AdminFinanceView;
  if (roleKind.value === "supervisor") return SupervisorFinanceView;
  return OperatorFinanceView;
});
</script>

<template>
  <component :is="roleComponent" />
</template>
