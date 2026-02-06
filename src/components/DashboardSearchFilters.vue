<script setup lang="ts">
/* global defineProps, defineEmits */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import FilterPanel from "@/components/FilterPanel.vue";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";

type DashboardFilters = {
  locations: string[];
};

type DashboardFilterKey =
  | "todas"
  | "activas"
  | "inactivas"
  | "mantenimiento"
  | "notificaciones";

const props = defineProps<{
  searchQuery: string;
  selectedFilter: DashboardFilterKey;
  visibleStateFilters: DashboardFilterKey[];
  availableLocations: string[];
  unreadCount: number;
  dark: boolean;
}>();

const emit = defineEmits<{
  (e: "update:searchQuery", value: string): void;
  (e: "select-filter", value: DashboardFilterKey): void;
  (e: "apply-filters", value: DashboardFilters): void;
}>();

const isDark = computed(() => !!props.dark);
const filterOpen = ref(false);
const filterButtonEl = ref<HTMLElement | null>(null);
const isMobileViewport = ref(false);
const filterPopoverStyle = ref<Record<string, string>>({
  top: "0px",
  left: "0px",
  width: "0px",
});

function updateViewportFlag() {
  isMobileViewport.value = window.matchMedia("(max-width: 639px)").matches;
}

onMounted(() => {
  updateViewportFlag();
  window.addEventListener("resize", updateViewportFlag, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("resize", updateViewportFlag);
});

useBodyScrollLock(computed(() => filterOpen.value && isMobileViewport.value));

function updateSearchQuery(event: Event) {
  const target = event.target as HTMLInputElement | null;
  emit("update:searchQuery", target?.value || "");
}

function selectFilter(filter: DashboardFilterKey) {
  emit("select-filter", filter);
}

function toggleFilters() {
  filterOpen.value = !filterOpen.value;
  if (filterOpen.value) {
    void nextTick().then(updateFilterPopoverPosition);
  }
}

function updateFilterPopoverPosition() {
  const el = filterButtonEl.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();

  // Mobile uses bottom sheet; no popover positioning
  if (isMobileViewport.value) return;

  // Fixed positioning uses viewport coords (no scrollY/scrollX)
  const desiredWidth = Math.min(420, Math.max(320, rect.width));
  const padding = 12;
  const maxLeft = window.innerWidth - desiredWidth - padding;
  const left = Math.min(
    Math.max(padding, rect.right - desiredWidth),
    Math.max(padding, maxLeft)
  );

  filterPopoverStyle.value = {
    top: `${rect.bottom + 8}px`,
    left: `${left}px`,
    width: `${desiredWidth}px`,
  };
}

function onGlobalReposition() {
  if (!filterOpen.value) return;
  updateFilterPopoverPosition();
}

function applyFilters(payload: DashboardFilters) {
  emit("apply-filters", payload);
  filterOpen.value = false;
}

watch(filterOpen, async (open) => {
  if (open) {
    await nextTick();
    updateFilterPopoverPosition();
    window.addEventListener("resize", onGlobalReposition, { passive: true });
    window.addEventListener("scroll", onGlobalReposition, true);
  } else {
    window.removeEventListener("resize", onGlobalReposition);
    window.removeEventListener("scroll", onGlobalReposition, true);
  }
});

onUnmounted(() => {
  window.removeEventListener("resize", onGlobalReposition);
  window.removeEventListener("scroll", onGlobalReposition, true);
});
</script>

<template>
  <section class="space-y-4">
    <div
      class="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border backdrop-blur-xl px-4 py-3 shadow-sm sm:flex sm:flex-row sm:items-center sm:justify-between sm:px-6"
      :class="
        isDark
          ? 'bg-zinc-900/70 border-zinc-800'
          : 'bg-white/70 border-slate-200/80'
      "
    >
      <div
        class="flex min-w-0 items-center gap-3 rounded-full px-3 py-2 text-sm sm:flex-1"
        :class="
          isDark
            ? 'bg-zinc-800/60 text-zinc-100'
            : 'bg-slate-100/80 text-slate-700'
        "
      >
        <svg
          :class="isDark ? 'text-zinc-400' : 'text-slate-400'"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M21 21l-4.35-4.35"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle
            cx="11"
            cy="11"
            r="6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <input
          type="text"
          placeholder="Buscar maquina u ubicacion..."
          :value="searchQuery"
          class="min-w-0 w-full bg-transparent text-xs outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-400 sm:text-sm"
          @input="updateSearchQuery"
        />
      </div>

      <div class="flex items-center gap-2 justify-self-end">
        <button
          ref="filterButtonEl"
          class="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition sm:text-sm cursor-pointer"
          :class="
            isDark
              ? 'border-zinc-800/70 bg-zinc-900/40 backdrop-blur-xl text-zinc-100 hover:bg-zinc-900/60'
              : 'border-slate-200/70 bg-white/50 backdrop-blur-xl text-slate-700 hover:bg-white/70'
          "
          @click="toggleFilters"
        >
          <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M3 4.6C3 4.03995 3 3.75992 3.10899 3.54601C3.20487 3.35785 3.35785 3.20487 3.54601 3.10899C3.75992 3 4.03995 3 4.6 3H19.4C19.9601 3 20.2401 3 20.454 3.10899C20.6422 3.20487 20.7951 3.35785 20.891 3.54601C21 3.75992 21 4.03995 21 4.6V6.33726C21 6.58185 21 6.70414 20.9724 6.81923C20.9479 6.92127 20.9075 7.01881 20.8526 7.10828C20.7908 7.2092 20.7043 7.29568 20.5314 7.46863L14.4686 13.5314C14.2957 13.7043 14.2092 13.7908 14.1474 13.8917C14.0925 13.9812 14.0521 14.0787 14.0276 14.1808C14 14.2959 14 14.4182 14 14.6627V17L10 21V14.6627C10 14.4182 10 14.2959 9.97237 14.1808C9.94787 14.0787 9.90747 13.9812 9.85264 13.8917C9.7908 13.7908 9.70432 13.7043 9.53137 13.5314L3.46863 7.46863C3.29568 7.29568 3.2092 7.2092 3.14736 7.10828C3.09253 7.01881 3.05213 6.92127 3.02763 6.81923C3 6.70414 3 6.58185 3 6.33726V4.6Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Filtro</span>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="filterOpen"
        class="fixed inset-0 z-[9998] bg-black/20"
        aria-hidden="true"
        @click="filterOpen = false"
      ></div>

      <!-- Mobile: bottom sheet -->
      <transition name="slide-up" appear>
        <div
          v-if="filterOpen && isMobileViewport"
          class="fixed inset-x-0 bottom-0 z-[9999]"
          @click.stop
        >
          <div
            class="mx-auto w-full max-w-lg rounded-t-3xl border p-4 shadow-2xl"
            :class="
              isDark
                ? 'border-zinc-800/70 bg-zinc-950 text-zinc-100'
                : 'border-slate-200/70 bg-white text-slate-800'
            "
          >
            <FilterPanel
              :open="true"
              placement="static"
              :locations="availableLocations"
              :dark="isDark"
              @close="filterOpen = false"
              @apply="applyFilters"
            />
          </div>
        </div>
      </transition>

      <!-- Desktop: popover anchored to button -->
      <div
        v-if="filterOpen && !isMobileViewport"
        class="fixed z-[9999]"
        :style="filterPopoverStyle"
        @click.stop
      >
        <FilterPanel
          :open="true"
          placement="static"
          :locations="availableLocations"
          :dark="isDark"
          @close="filterOpen = false"
          @apply="applyFilters"
        />
      </div>
    </Teleport>
  </section>

  <div class="mb-4 flex items-center gap-2">
    <div
      class="flex flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain pr-2 sm:flex-nowrap"
    >
      <button
        v-for="filter in visibleStateFilters"
        :key="filter"
        @click="selectFilter(filter)"
        :class="[
          'shrink-0 px-3 py-1 rounded-full font-medium text-xs sm:text-sm cursor-pointer transition',
          selectedFilter === filter
            ? isDark
              ? 'bg-white/10 text-white border border-zinc-700/80 hover:bg-white/15'
              : 'bg-slate-900 text-white hover:bg-slate-800'
            : isDark
            ? 'bg-zinc-900/60 text-zinc-200 border border-zinc-800 hover:bg-zinc-800/50'
            : 'bg-white/50 backdrop-blur text-slate-600 border border-slate-200/70 hover:bg-white/70',
        ]"
      >
        {{ filter.charAt(0).toUpperCase() + filter.slice(1) }}
      </button>
    </div>

    <div class="relative shrink-0">
      <button
        type="button"
        @click.stop="selectFilter('notificaciones')"
        class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition"
        :class="
          isDark
            ? 'bg-zinc-900 text-white border border-zinc-700/60'
            : 'bg-white/50 text-slate-700 border border-slate-200/70'
        "
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5"
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
        <span class="hidden sm:inline">Notifs</span>
        <span
          v-if="unreadCount > 0"
          class="inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white"
        >
          {{ unreadCount }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease;
  will-change: transform, opacity;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translate3d(0, 10px, 0);
  opacity: 0;
}

.slide-up-enter-to,
.slide-up-leave-from {
  transform: translate3d(0, 0, 0);
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .slide-up-enter-active,
  .slide-up-leave-active {
    transition: none;
  }
}
</style>
