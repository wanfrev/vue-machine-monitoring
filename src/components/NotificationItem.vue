<script setup lang="ts">
/* global defineProps */
import { computed } from "vue";
import { formatNotificationDate, formatNotificationTime } from "@/utils/date";
import { normalizeMachineName } from "@/utils/machine";

type DashboardNotificationType =
  | "machine_on"
  | "machine_off"
  | "coin_inserted"
  | "event";

type DashboardNotification = {
  id: number;
  type: DashboardNotificationType;
  machineId: string;
  machineName?: string;
  location?: string;
  timestamp: string;
  amount?: number;
  detail?: string;
};

const props = defineProps<{
  notification: DashboardNotification;
  dark: boolean;
}>();

const isDark = computed(() => !!props.dark);

function getNotificationTitle() {
  if (props.notification.type === "machine_on") return "Máquina encendida";
  if (props.notification.type === "machine_off") return "Máquina apagada";
  if (props.notification.type === "coin_inserted") return "Moneda ingresada";
  return "Nuevo evento";
}

function getNotificationDetailLine() {
  if (props.notification.type === "coin_inserted") {
    const amount = Number(props.notification.amount ?? 1) || 1;
    return `+${amount} moneda(s)`;
  }
  return (props.notification.detail || "").trim();
}

function getNotificationCardClass() {
  return isDark.value
    ? "border-slate-700/60 bg-slate-900/40"
    : "border-slate-200/70 bg-white/80";
}

function getNotificationDotClass() {
  if (props.notification.type === "machine_on") return "bg-emerald-500";
  if (props.notification.type === "machine_off") return "bg-red-500";
  if (props.notification.type === "coin_inserted") return "bg-amber-400";
  return isDark.value ? "bg-slate-500" : "bg-slate-400";
}

function getNotificationTitleTextClass() {
  return isDark.value ? "text-slate-100" : "text-slate-900";
}
</script>

<template>
  <div class="rounded-xl border p-3" :class="getNotificationCardClass()">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 min-w-0">
          <span
            class="mt-0.5 h-2.5 w-2.5 rounded-full shrink-0"
            :class="getNotificationDotClass()"
            aria-hidden="true"
          ></span>
          <p
            class="text-xs font-semibold truncate"
            :class="getNotificationTitleTextClass()"
          >
            {{ getNotificationTitle() }}
          </p>
        </div>
        <p
          class="text-[12px] text-slate-500 truncate"
          :class="isDark ? 'text-slate-400' : ''"
        >
          {{ normalizeMachineName(notification.machineName) }}
          <span v-if="notification.location">
            • {{ notification.location }}
          </span>
        </p>
      </div>
      <div class="text-right shrink-0">
        <p class="text-[11px] text-slate-400">
          {{ formatNotificationDate(notification.timestamp) }}
        </p>
        <p class="text-[11px] text-slate-400">
          {{ formatNotificationTime(notification.timestamp) }}
        </p>
      </div>
    </div>
    <p
      v-if="getNotificationDetailLine()"
      class="mt-1 text-xs"
      :class="isDark ? 'text-slate-300' : 'text-slate-600'"
    >
      {{ getNotificationDetailLine() }}
    </p>
  </div>
</template>
