<script setup lang="ts">
/* global defineProps, defineEmits */
import { computed, toRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import { setAuthToken } from "../api/client";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
// Multi-word component name to satisfy eslint vue/multi-word-component-names
// (Implicit from filename AppSidebar.vue)

const props = defineProps<{ open: boolean; dark?: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const isDark = computed(() => !!props.dark);

// Prevent background scroll when sidebar is open
useBodyScrollLock(toRef(props, "open"));

function close() {
  emit("close");
}

const router = useRouter();
const route = useRoute();
function logout() {
  setAuthToken(null);
  router.push({ name: "login" });
}
// Obtener el rol del usuario desde localStorage
const userRole = localStorage.getItem("role") || "";

const roleLabel = computed(() => {
  if (userRole === "admin") return "Administrador";
  if (userRole === "employee") return "Empleado";
  if (userRole === "operator") return "Operador";
  return "Usuario";
});

function isActiveRoute(name: string) {
  return String(route.name || "") === name;
}
</script>

<template>
  <!-- Overlay -->
  <transition name="fade" appear>
    <div
      v-show="open"
      class="fixed inset-0 z-40 bg-black/40"
      aria-hidden="true"
      @click="close"
    ></div>
  </transition>

  <!-- Sidebar panel -->
  <transition name="slide-left" appear>
    <aside
      v-show="open"
      class="fixed inset-y-0 left-0 z-50 flex w-72 max-w-full flex-col rounded-2xl border px-4 py-5 shadow-xl backdrop-blur-xl sm:w-80"
      :class="
        isDark
          ? 'border-slate-700/60 bg-slate-900/40 text-slate-100'
          : 'border-slate-200/70 bg-white/60 text-slate-700'
      "
      role="dialog"
      aria-modal="true"
    >
      <!-- Header -->
      <div class="mb-4 flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-3">
            <div
              class="h-10 w-10 overflow-hidden rounded-full border"
              :class="isDark ? 'border-slate-600/60' : 'border-slate-200/70'"
            >
              <img
                src="/img/icons/K11BOX.webp"
                alt="MachineHub"
                class="h-full w-full object-cover"
              />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold leading-tight">MachineHub</p>
              <p
                class="mt-0.5 text-[11px] font-medium uppercase tracking-wide"
                :class="isDark ? 'text-slate-400' : 'text-slate-500'"
              >
                {{ roleLabel }}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition cursor-pointer"
          :class="
            isDark
              ? 'border-slate-700/60 bg-slate-950/10 hover:bg-slate-950/20'
              : 'border-slate-200/70 bg-white/50 hover:bg-white/70'
          "
          aria-label="Cerrar menú lateral"
          @click="close"
        >
          ✕
        </button>
      </div>

      <div
        class="h-px w-full"
        :class="isDark ? 'bg-slate-700/60' : 'bg-slate-200/70'"
      ></div>

      <!-- Navigation -->
      <nav
        class="flex-1 space-y-1 pt-4 text-sm"
        aria-label="Navegación principal"
      >
        <p
          class="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide"
          :class="isDark ? 'text-slate-400' : 'text-slate-500'"
        >
          Navegación
        </p>

        <!-- Dashboard link -->
        <button
          class="flex w-full items-center justify-between rounded-xl px-3 py-2 font-medium transition cursor-pointer border"
          :class="
            isActiveRoute('dashboard')
              ? isDark
                ? 'border-sky-500/60 bg-sky-900/35 text-sky-100'
                : 'border-sky-100 bg-sky-50/80 text-sky-800'
              : isDark
              ? 'border-transparent text-slate-200 hover:border-sky-400/40 hover:bg-sky-900/20 hover:text-sky-100'
              : 'border-transparent text-slate-700 hover:border-sky-200/80 hover:bg-sky-50/70 hover:text-sky-800'
          "
          @click="
            $emit('close');
            router.push({ name: 'dashboard' });
          "
        >
          <div class="flex items-center gap-3">
            <span
              v-if="isActiveRoute('dashboard')"
              class="h-6 w-0.5 rounded-full"
              :class="isDark ? 'bg-sky-400' : 'bg-sky-500'"
            ></span>
            <span class="inline-flex items-center gap-2">
              <!-- Icono Dashboard: grid/casa -->
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M4 11V9.4c0-.46 0-.69.06-.9a1.5 1.5 0 0 1 .18-.38c.11-.18.26-.33.57-.62l5-4.67c.53-.49.8-.73 1.1-.82a1.5 1.5 0 0 1 .82 0c.3.09.57.33 1.1.82l5 4.67c.31.29.46.44.57.62.08.12.14.25.18.38.06.21.06.44.06.9V11"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M10 21h4c1.1 0 1.65 0 2.08-.22a2 2 0 0 0 .7-.7C17 19.65 17 19.1 17 18v-3.5C17 13.57 16.43 13 15.5 13H8.5C7.57 13 7 13.57 7 14.5V18c0 1.1 0 1.65.22 2.08.18.33.45.6.78.78C8.35 21 8.9 21 10 21Z"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>Dashboard</span>
            </span>
          </div>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M9 18l6-6-6-6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <!-- Machines link -->
        <button
          class="flex w-full items-center justify-between rounded-xl px-3 py-2 font-medium transition cursor-pointer border"
          :class="
            isActiveRoute('machines')
              ? isDark
                ? 'border-sky-500/60 bg-sky-900/35 text-sky-100'
                : 'border-sky-100 bg-sky-50/80 text-sky-800'
              : isDark
              ? 'border-transparent text-slate-200 hover:border-sky-400/40 hover:bg-sky-900/20 hover:text-sky-100'
              : 'border-transparent text-slate-700 hover:border-sky-200/80 hover:bg-sky-50/70 hover:text-sky-800'
          "
          @click="
            $emit('close');
            router.push({ name: 'machines' });
          "
        >
          <div class="flex items-center gap-3">
            <span
              v-if="isActiveRoute('machines')"
              class="h-6 w-0.5 rounded-full"
              :class="isDark ? 'bg-sky-400' : 'bg-sky-500'"
            ></span>
            <span class="inline-flex items-center gap-2">
              <!-- Icono Máquinas: grid/cubos -->
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect
                  x="4"
                  y="4"
                  width="6"
                  height="6"
                  rx="1.5"
                  stroke="currentColor"
                  stroke-width="1.6"
                />
                <rect
                  x="14"
                  y="4"
                  width="6"
                  height="6"
                  rx="1.5"
                  stroke="currentColor"
                  stroke-width="1.6"
                />
                <rect
                  x="4"
                  y="14"
                  width="6"
                  height="6"
                  rx="1.5"
                  stroke="currentColor"
                  stroke-width="1.6"
                />
                <rect
                  x="14"
                  y="14"
                  width="6"
                  height="6"
                  rx="1.5"
                  stroke="currentColor"
                  stroke-width="1.6"
                />
              </svg>
              <span>Máquinas</span>
            </span>
          </div>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M9 18l6-6-6-6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <!-- Employees link (admin only) -->
        <button
          v-if="userRole === 'admin'"
          class="flex w-full items-center justify-between rounded-xl px-3 py-2 font-medium transition cursor-pointer border"
          :class="
            isActiveRoute('employees')
              ? isDark
                ? 'border-sky-500/60 bg-sky-900/35 text-sky-100'
                : 'border-sky-100 bg-sky-50/80 text-sky-800'
              : isDark
              ? 'border-transparent text-slate-200 hover:border-sky-400/40 hover:bg-sky-900/20 hover:text-sky-100'
              : 'border-transparent text-slate-700 hover:border-sky-200/80 hover:bg-sky-50/70 hover:text-sky-800'
          "
          @click="
            $emit('close');
            router.push({ name: 'employees' });
          "
        >
          <div class="flex items-center gap-3">
            <span
              v-if="isActiveRoute('employees')"
              class="h-6 w-0.5 rounded-full"
              :class="isDark ? 'bg-sky-400' : 'bg-sky-500'"
            ></span>
            <span class="inline-flex items-center gap-2">
              <!-- Icono Supervisores: usuarios -->
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M15.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M5 18.25C5 15.9 7.24 14 10 14h4c2.76 0 5 1.9 5 4.25"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
              <span>Supervisores y Empleados</span>
            </span>
          </div>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M9 18l6-6-6-6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </nav>

      <!-- Footer actions -->
      <div class="mt-4 space-y-2 text-xs">
        <div
          class="h-px w-full"
          :class="isDark ? 'bg-slate-700/60' : 'bg-slate-200/70'"
        ></div>

        <button
          class="inline-flex items-center gap-2 px-2 py-1.5 text-xs font-medium cursor-pointer"
          :class="
            isDark
              ? 'text-red-300 hover:text-red-200'
              : 'text-red-500 hover:text-red-600'
          "
          @click="logout"
        >
          <svg
            class="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M10 5H7.5C6.12 5 5 6.12 5 7.5v9C5 17.88 6.12 19 7.5 19H10"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M14 8l4 4-4 4"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M18 12H10"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
          <span>Salir</span>
        </button>
        <p
          class="text-center text-[11px]"
          :class="isDark ? 'text-slate-500' : 'text-slate-400'"
        >
          © 2025 MachineHub
        </p>
      </div>
    </aside>
  </transition>
</template>

<style scoped>
/* Fade for overlay */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide for sidebar */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.25s cubic-bezier(0.2, 0.9, 0.2, 1), opacity 0.25s ease;
  will-change: transform, opacity;
}
.slide-left-enter-from,
.slide-left-leave-to {
  transform: translate3d(-100%, 0, 0);
  opacity: 0;
  backface-visibility: hidden;
  transform-origin: left center;
}
.slide-left-enter-to,
.slide-left-leave-from {
  transform: translate3d(0, 0, 0);
  opacity: 1;
}
</style>
