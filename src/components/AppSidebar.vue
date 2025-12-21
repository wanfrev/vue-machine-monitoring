<script setup lang="ts">
/* global defineProps, defineEmits */
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { setAuthToken } from "../api/client";
// Multi-word component name to satisfy eslint vue/multi-word-component-names
// (Implicit from filename AppSidebar.vue)

const props = defineProps<{ open: boolean; dark?: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const isDark = computed(() => !!props.dark);

// Prevent background scroll when sidebar is open
watch(
  () => props.open,
  (open) => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
  }
);

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
              :class="isDark ? 'border-red-300/40' : 'border-red-200/70'"
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
        <button
          class="flex w-full items-center justify-between rounded-xl px-3 py-2 font-medium transition cursor-pointer border"
          :class="
            isActiveRoute('dashboard')
              ? isDark
                ? 'border-red-400/40 bg-red-950/25 text-red-100'
                : 'border-red-200/80 bg-red-50/70 text-red-800'
              : isDark
              ? 'border-transparent text-slate-200 hover:border-red-400/40 hover:bg-red-950/20 hover:text-red-200'
              : 'border-transparent text-slate-700 hover:border-red-200/80 hover:bg-red-50/70 hover:text-red-700'
          "
          @click="
            $emit('close');
            router.push({ name: 'dashboard' });
          "
        >
          <span>Dashboard</span>
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
        <button
          class="flex w-full items-center justify-between rounded-xl px-3 py-2 font-medium transition cursor-pointer border"
          :class="
            isActiveRoute('machines')
              ? isDark
                ? 'border-red-400/40 bg-red-950/25 text-red-100'
                : 'border-red-200/80 bg-red-50/70 text-red-800'
              : isDark
              ? 'border-transparent text-slate-200 hover:border-red-400/40 hover:bg-red-950/20 hover:text-red-200'
              : 'border-transparent text-slate-700 hover:border-red-200/80 hover:bg-red-50/70 hover:text-red-700'
          "
          @click="
            $emit('close');
            router.push({ name: 'machines' });
          "
        >
          <span>Máquinas</span>
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
        <button
          v-if="userRole === 'admin'"
          class="flex w-full items-center justify-between rounded-xl px-3 py-2 font-medium transition cursor-pointer border"
          :class="
            isActiveRoute('employees')
              ? isDark
                ? 'border-red-400/40 bg-red-950/25 text-red-100'
                : 'border-red-200/80 bg-red-50/70 text-red-800'
              : isDark
              ? 'border-transparent text-slate-200 hover:border-red-400/40 hover:bg-red-950/20 hover:text-red-200'
              : 'border-transparent text-slate-700 hover:border-red-200/80 hover:bg-red-50/70 hover:text-red-700'
          "
          @click="
            $emit('close');
            router.push({ name: 'employees' });
          "
        >
          <span>Supervisores y Empleados</span>
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
          class="w-full rounded-lg px-3 py-2 font-medium transition cursor-pointer"
          :class="
            isDark
              ? 'bg-slate-950/10 text-slate-100 hover:bg-slate-950/20 border border-slate-700/60'
              : 'bg-white/50 text-slate-700 hover:bg-white/70 border border-slate-200/70'
          "
          @click="logout"
        >
          Salir
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
