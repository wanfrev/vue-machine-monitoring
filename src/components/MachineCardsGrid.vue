<script setup lang="ts">
/* global defineProps, defineEmits */
import MachineCard from "@/components/MachineCard.vue";

type MachineStatus = "active" | "inactive" | "maintenance" | string;

type Machine = {
  id: string;
  name: string;
  status: MachineStatus;
  location?: string;
  last_on?: string | null;
  last_off?: string | null;
  test_mode?: boolean;
  type?: string;
};

const props = defineProps<{
  machines: Machine[];
  isDark: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  statusMenuOpenId: string | null;
  coinsByMachine: Record<string, number>;
  dailyCoinsByMachine: Record<string, number>;
  weeklyCoinsByMachine: Record<string, number>;
  firstOnTodayByMachine: Record<string, string>;
}>();

const emit = defineEmits<{
  (e: "select-machine", machine: Machine): void;
  (e: "toggle-status-menu", machineId: string): void;
  (e: "toggle-maintenance", machine: Machine): void;
  (e: "toggle-test-mode", machine: Machine): void;
}>();

function getDailyCoins(machineId: string): number {
  return props.dailyCoinsByMachine[machineId] || 0;
}

function getWeeklyCoins(machineId: string): number {
  return props.weeklyCoinsByMachine[machineId] || 0;
}
</script>

<template>
  <section
    class="grid grid-cols-2 gap-3 pb-6 auto-rows-fr sm:gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3"
  >
    <MachineCard
      v-for="machine in machines"
      :key="machine.name"
      :machine="machine"
      :is-dark="isDark"
      :is-admin="isAdmin"
      :is-operator="isOperator"
      :is-menu-open="statusMenuOpenId === machine.id"
      :daily-coins="getDailyCoins(machine.id)"
      :weekly-coins="getWeeklyCoins(machine.id)"
      :first-on-today="firstOnTodayByMachine[machine.id]"
      @select="emit('select-machine', $event)"
      @toggle-menu="emit('toggle-status-menu', $event)"
      @toggle-maintenance="emit('toggle-maintenance', $event)"
      @toggle-test-mode="emit('toggle-test-mode', $event)"
      @close-menu="emit('toggle-status-menu', $event)"
    />
  </section>
</template>
