<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { setAuthToken } from "../api/client";
import { useTheme } from "@/composables/useTheme";
import EditProfileModal from "@/components/EditProfileModal.vue";
import { useCurrentUser } from "@/composables/useCurrentUser";

const router = useRouter();
const { isDark: isDarkRef, toggleDarkMode } = useTheme();
const isDark = () => isDarkRef.value;

const currentUserName = ref(
  localStorage.getItem("userName") ||
    localStorage.getItem("username") ||
    "Usuario"
);

const { roleLabel } = useCurrentUser();

const initials = computed(() => {
  const base = String(currentUserName.value || "").trim();
  if (!base) return "U";
  const parts = base.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
});

const isEditProfileOpen = ref(false);

const showUpdateCard = ref(false);
let swRegistration: ServiceWorkerRegistration | null = null;

function openEditProfile() {
  isEditProfileOpen.value = true;
}

function onProfileUpdated(payload: { name: string; username: string }) {
  currentUserName.value = payload.name || payload.username || "Usuario";
}

function logout() {
  setAuthToken(null);
  router.push({ name: "login" });
}

function applyUpdate() {
  if (swRegistration && swRegistration.waiting) {
    // Ask the waiting SW to skipWaiting, then reload on controllerchange
    swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}

function onSwUpdated(ev: Event) {
  const custom = ev as CustomEvent<ServiceWorkerRegistration>;
  swRegistration = custom.detail;
  showUpdateCard.value = true;
}

function onControllerChange() {
  window.location.reload();
}

async function checkWaitingSw() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.waiting) {
      swRegistration = registration;
      showUpdateCard.value = true;
    }
  } catch (e) {
    // ignore
  }
}

onMounted(() => {
  window.addEventListener("swUpdated", onSwUpdated);
  navigator.serviceWorker?.addEventListener(
    "controllerchange",
    onControllerChange
  );
  checkWaitingSw();
});

onUnmounted(() => {
  window.removeEventListener("swUpdated", onSwUpdated);
  navigator.serviceWorker?.removeEventListener(
    "controllerchange",
    onControllerChange
  );
});
</script>

<template>
  <section
    :class="[
      'min-h-screen px-4 py-6 sm:px-8 sm:py-8',
      isDark() ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900',
    ]"
  >
    <div class="mx-auto flex w-full max-w-xl flex-col gap-6">
      <header
        class="rounded-3xl border px-5 py-6 shadow-sm"
        :class="
          isDark()
            ? 'border-zinc-800/70 bg-zinc-900/70'
            : 'border-slate-200/70 bg-white'
        "
      >
        <div class="flex items-center gap-4">
          <div
            class="flex h-16 w-16 items-center justify-center rounded-full text-lg font-semibold"
            :class="
              isDark()
                ? 'bg-zinc-800 text-zinc-100'
                : 'bg-slate-100 text-slate-700'
            "
          >
            {{ initials }}
          </div>
          <div class="min-w-0">
            <p class="text-xl font-semibold truncate">{{ currentUserName }}</p>
            <p
              class="text-sm"
              :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
            >
              {{ roleLabel }}
            </p>
          </div>
        </div>
        <button
          type="button"
          class="mt-4 text-sm font-medium"
          :class="
            isDark()
              ? 'text-zinc-200 hover:text-white'
              : 'text-slate-700 hover:text-slate-900'
          "
          @click="openEditProfile"
        >
          Editar mis datos
        </button>
      </header>

      <div
        class="rounded-3xl border px-5 py-4"
        :class="
          isDark()
            ? 'border-zinc-800/70 bg-zinc-900/60'
            : 'border-slate-200/70 bg-white'
        "
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="flex h-9 w-9 items-center justify-center rounded-full"
              :class="
                isDark()
                  ? 'bg-zinc-800 text-amber-200'
                  : 'bg-slate-100 text-amber-500'
              "
            >
              <span class="text-sm">{{ isDark() ? "☾" : "☀" }}</span>
            </div>
            <div>
              <p class="text-sm font-medium">Modo oscuro</p>
              <p
                class="text-xs"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                Cambia la apariencia de la app
              </p>
            </div>
          </div>
          <button
            type="button"
            class="relative inline-flex h-7 w-12 items-center rounded-full transition"
            :class="isDark() ? 'bg-emerald-400/80' : 'bg-slate-200'"
            role="switch"
            :aria-checked="isDark()"
            @click="toggleDarkMode()"
          >
            <span
              class="inline-block h-5 w-5 rounded-full bg-white shadow transition"
              :class="isDark() ? 'translate-x-6' : 'translate-x-1'"
            ></span>
          </button>
        </div>
      </div>

      <div
        v-if="showUpdateCard"
        class="relative overflow-hidden rounded-3xl border px-5 py-4"
        :class="
          isDark()
            ? 'border-amber-400/30 bg-zinc-900/70'
            : 'border-amber-200/70 bg-white'
        "
      >
        <span
          class="absolute left-0 top-3 bottom-3 w-1 rounded-full"
          :class="isDark() ? 'bg-amber-400' : 'bg-amber-500'"
        ></span>
        <div class="flex items-center justify-between gap-4 pl-1">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full"
              :class="
                isDark()
                  ? 'bg-amber-500/15 text-amber-200'
                  : 'bg-amber-100 text-amber-700'
              "
            >
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 3v10"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M5.5 7.5a7 7 0 1 0 13 0"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold">Nueva version disponible</p>
              <p
                class="text-xs"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                Recarga para aplicar la actualizacion
              </p>
            </div>
          </div>
          <button
            type="button"
            class="rounded-xl px-4 py-2 text-sm font-semibold"
            :class="
              isDark()
                ? 'bg-amber-400/90 text-black hover:bg-amber-400'
                : 'bg-amber-400 text-black hover:bg-amber-300'
            "
            @click="applyUpdate"
          >
            Recargar
          </button>
        </div>
      </div>

      <button
        type="button"
        class="rounded-2xl border px-5 py-3 text-sm font-semibold text-red-500"
        :class="
          isDark()
            ? 'border-red-500/30 bg-zinc-900/40 hover:bg-zinc-900/70'
            : 'border-red-200 bg-white hover:bg-red-50'
        "
        @click="logout"
      >
        Cerrar sesion
      </button>
    </div>

    <EditProfileModal
      :open="isEditProfileOpen"
      :dark="isDark()"
      @close="isEditProfileOpen = false"
      @updated="onProfileUpdated"
    />
  </section>
</template>

<style scoped></style>
