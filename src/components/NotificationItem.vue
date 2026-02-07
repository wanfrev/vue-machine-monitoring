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
</script>

<template>
  <div
    class="rounded-xl border p-3"
    :class="getNotificationCardClass(notification.type, isDark)"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 min-w-0">
          <p
            class="text-xs font-semibold truncate"
            :class="getNotificationTitleTextClass(isDark)"
          >
            {{ getNotificationTitle(notification.type) }}
          </p>
        </div>
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
</template>
