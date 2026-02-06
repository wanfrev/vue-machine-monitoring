<script setup lang="ts">
/* global defineProps, defineEmits */
import { computed } from "vue";
import NotificationFilters from "@/components/NotificationFilters.vue";
import NotificationItem from "@/components/NotificationItem.vue";
import type { DashboardNotification } from "@/types/dashboard";
import { getNotificationTitle } from "@/utils/notification";

const props = defineProps<{
  dark: boolean;
  isTodayOnly: boolean;
  notificationFrom: string | null;
  notificationTo: string | null;
  visibleNotifications: DashboardNotification[];
  pagedNotifications: DashboardNotification[];
  notificationPage: number;
  notificationTotalPages: number;
}>();

const emit = defineEmits<{
  (e: "update:is-today-only", value: boolean): void;
  (e: "update:notification-from", value: string | null): void;
  (e: "update:notification-to", value: string | null): void;
  (e: "update:notification-page", value: number): void;
  (e: "apply-today"): void;
  (e: "apply-range"): void;
}>();

const isDark = computed(() => !!props.dark);

function updateIsTodayOnly(value: boolean) {
  emit("update:is-today-only", value);
}

function updateNotificationFrom(value: string | null) {
  emit("update:notification-from", value);
}

function updateNotificationTo(value: string | null) {
  emit("update:notification-to", value);
}

function emitApplyToday() {
  emit("apply-today");
}

function emitApplyRange() {
  emit("apply-range");
}

function goPrev() {
  emit("update:notification-page", Math.max(1, props.notificationPage - 1));
}

function goNext() {
  emit(
    "update:notification-page",
    Math.min(props.notificationTotalPages, props.notificationPage + 1)
  );
}
</script>

<template>
  <section
    class="rounded-2xl border bg-white/60 backdrop-blur-xl p-4 shadow-sm sm:p-6 border-slate-200/70"
    :class="
      isDark
        ? 'bg-slate-900/40 border-slate-700/60 text-white'
        : 'bg-white/60 border-slate-200/70 text-slate-900'
    "
  >
    <div
      class="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <h2 class="text-sm font-semibold">Historial de notificaciones</h2>
      <NotificationFilters
        :dark="isDark"
        :is-today-only="isTodayOnly"
        :notification-from="notificationFrom"
        :notification-to="notificationTo"
        @update:is-today-only="updateIsTodayOnly"
        @update:notification-from="updateNotificationFrom"
        @update:notification-to="updateNotificationTo"
        @apply-today="emitApplyToday"
        @apply-range="emitApplyRange"
      />
    </div>

    <div v-if="!visibleNotifications.length" class="text-xs text-slate-400">
      No hay notificaciones
    </div>

    <div
      v-else
      class="space-y-2 max-h-[520px] overflow-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/70 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/70"
    >
      <NotificationItem
        v-for="n in pagedNotifications"
        :key="n.id"
        :notification="n"
        :dark="isDark"
        :aria-label="getNotificationTitle(n.type)"
      />
    </div>

    <div
      v-if="visibleNotifications.length && notificationTotalPages > 1"
      class="mt-4 flex items-center justify-between gap-2"
    >
      <button
        type="button"
        class="px-3 py-1 rounded-full text-xs font-semibold border transition"
        :disabled="notificationPage <= 1"
        :class="[
          notificationPage <= 1
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer',
          isDark
            ? 'bg-slate-950/10 text-slate-200 border-slate-700/60 hover:bg-slate-950/20'
            : 'bg-white/40 text-slate-700 border-slate-200/70 hover:bg-white/60',
        ]"
        @click="goPrev"
      >
        Anterior
      </button>

      <p class="text-[11px] text-slate-400">
        Página {{ notificationPage }} de {{ notificationTotalPages }}
      </p>

      <button
        type="button"
        class="px-3 py-1 rounded-full text-xs font-semibold border transition"
        :disabled="notificationPage >= notificationTotalPages"
        :class="[
          notificationPage >= notificationTotalPages
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer',
          isDark
            ? 'bg-slate-950/10 text-slate-200 border-slate-700/60 hover:bg-slate-950/20'
            : 'bg-white/40 text-slate-700 border-slate-200/70 hover:bg-white/60',
        ]"
        @click="goNext"
      >
        Siguiente
      </button>
    </div>
  </section>
</template>
