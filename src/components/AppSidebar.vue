<script setup lang="ts">
import { computed, defineEmits, defineProps, watch } from "vue";
import { useRouter } from "vue-router";
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
function logout() {
  setAuthToken(null);
  router.push({ name: "login" });
}
// Obtener el rol del usuario desde localStorage
const userRole = localStorage.getItem("role") || "";
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
      class="fixed inset-y-0 left-0 z-50 flex w-72 max-w-full flex-col border-r px-4 py-5 shadow-xl sm:w-80 rounded-xl"
      :class="
        isDark
          ? 'border-slate-800 bg-slate-900 text-slate-100'
          : 'border-slate-200 bg-white text-slate-700'
      "
      role="dialog"
      aria-modal="true"
    >
      <!-- Header -->
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-semibold tracking-wide">Menú</h2>
        <button
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition cursor-pointer"
          :class="
            isDark
              ? 'border-slate-700 bg-slate-800 hover:bg-slate-700'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          "
          aria-label="Cerrar menú lateral"
          @click="close"
        >
          ✕
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 space-y-1 text-sm" aria-label="Navegación principal">
        <button
          class="flex w-full items-center justify-between rounded-lg px-3 py-2 font-medium transition cursor-pointer"
          :class="
            isDark
              ? 'hover:bg-slate-800 text-slate-200'
              : 'hover:bg-slate-100 text-slate-700'
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
          class="flex w-full items-center justify-between rounded-lg px-3 py-2 font-medium transition cursor-pointer"
          :class="
            isDark
              ? 'hover:bg-slate-800 text-slate-200'
              : 'hover:bg-slate-100 text-slate-700'
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
          class="flex w-full items-center justify-between rounded-lg px-3 py-2 font-medium transition cursor-pointer"
          :class="
            isDark
              ? 'hover:bg-slate-800 text-slate-200'
              : 'hover:bg-slate-100 text-slate-700'
          "
          @click="
            $emit('close');
            router.push({ name: 'employees' });
          "
        >
          <span>Empleados</span>
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
        <button
          class="w-full rounded-lg px-3 py-2 font-medium transition cursor-pointer"
          :class="
            isDark
              ? 'bg-red-600 text-white hover:bg-red-500'
              : 'bg-red-600 text-white hover:bg-red-700'
          "
        >
          Nueva máquina
        </button>
        <button
          class="w-full rounded-lg px-3 py-2 font-medium transition cursor-pointer"
          :class="
            isDark
              ? 'bg-slate-700 text-slate-100 hover:bg-slate-800'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-50'
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
