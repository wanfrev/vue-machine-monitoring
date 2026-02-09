<script setup lang="ts">
/* global defineProps */
import { computed } from "vue";
import { formatNotificationDate, formatNotificationTime } from "@/utils/date";
import { normalizeMachineName } from "@/utils/machine";
import type { DashboardNotification } from "@/types/dashboard";
import {
  getNotificationCardClass,
  getNotificationDetailLine,
  getNotificationTitle,
  getNotificationTitleTextClass,
} from "@/utils/notification";

const props = defineProps<{
  notification: DashboardNotification;
  dark: boolean;
}>();

const isDark = computed(() => !!props.dark);

const iconToneClass = computed(() => {
  if (props.notification.type === "machine_on") {
    return isDark.value
      ? "bg-emerald-500/15 text-emerald-200"
      : "bg-emerald-100 text-emerald-700";
  }
  if (props.notification.type === "machine_off") {
    return isDark.value
      ? "bg-rose-500/15 text-rose-200"
      : "bg-rose-100 text-rose-700";
  }
  if (props.notification.type === "coin_inserted") {
    return isDark.value
      ? "bg-amber-500/15 text-amber-200"
      : "bg-amber-100 text-amber-700";
  }
  return isDark.value
    ? "bg-zinc-800/70 text-zinc-200"
    : "bg-slate-100 text-slate-600";
});
</script>

<template>
  <div
    class="rounded-2xl border p-3"
    :class="getNotificationCardClass(notification.type, isDark)"
  >
    <div class="flex items-start gap-3">
      <div
        class="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full"
        :class="iconToneClass"
      >
        <svg
          v-if="notification.type === 'coin_inserted'"
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="8"
            stroke="currentColor"
            stroke-width="2"
          />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
        <svg
          v-else-if="notification.type === 'machine_on'"
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M12 2v10"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M7.05 6.05a7 7 0 1 0 9.9 0"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <svg
          v-else-if="notification.type === 'machine_off'"
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M12 2v10"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M7.05 6.05a7 7 0 1 0 9.9 0"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <svg
          v-else
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M13.73 21a2 2 0 0 1-3.46 0"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p
              class="text-xs font-semibold truncate"
              :class="getNotificationTitleTextClass(isDark)"
            >
              {{ getNotificationTitle(notification.type) }}
            </p>
            <p
              class="text-[12px] text-slate-500 truncate"
              :class="isDark ? 'text-zinc-400' : ''"
            >
              {{ normalizeMachineName(notification.machineName) }}
              <span v-if="notification.location">
                • {{ notification.location }}
              </span>
            </p>
          </div>
          <div class="text-right shrink-0">
            <p
              class="text-[11px]"
              :class="isDark ? 'text-zinc-400' : 'text-slate-400'"
            >
              {{ formatNotificationDate(notification.timestamp) }}
            </p>
            <p
              class="text-[11px]"
              :class="isDark ? 'text-zinc-400' : 'text-slate-400'"
            >
              {{ formatNotificationTime(notification.timestamp) }}
            </p>
          </div>
        </div>
        <p
          v-if="getNotificationDetailLine(notification)"
          class="mt-1 text-xs"
          :class="isDark ? 'text-zinc-300' : 'text-slate-600'"
        >
          {{ getNotificationDetailLine(notification) }}
        </p>
      </div>
    </div>
  </div>
</template>
