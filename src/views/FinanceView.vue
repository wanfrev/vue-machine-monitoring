<script setup lang="ts">
import { computed } from "vue";
import { useCurrentUser } from "@/composables/useCurrentUser";
import FinanceUnifiedView from "@/views/FinanceUnifiedView.vue";
import OperatorFinanceView from "@/views/OperatorFinanceView.vue";

const { roleKind } = useCurrentUser();

const roleComponent = computed(() =>
  roleKind.value === "operator" ? OperatorFinanceView : FinanceUnifiedView
);
</script>

<template>
  <component :is="roleComponent" />
</template>
