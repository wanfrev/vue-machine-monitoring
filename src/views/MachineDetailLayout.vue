<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { getMachines, updateMachine } from "../api/client";
import {
  canAccessMachine,
  filterMachinesForRole,
  getAssignedMachineIdsFromStorage,
} from "@/utils/access";

const route = useRoute();
const router = useRouter();

const id = computed(() => (route.params.id as string) || "Máquina");
const locationText = computed(
  () => (route.query.location as string) || "Centro comercial - Pasillo A"
);

const currentRole = ref(localStorage.getItem("role") || "");
const isAdmin = computed(() => currentRole.value === "admin");
const assignedMachineIds = ref<string[]>(getAssignedMachineIdsFromStorage());

type ApiMachine = { id: string | number; name: string; status?: string };
const resolvedMachineId = ref<string | null>(null);
const resolvedStatus = ref<string>("inactive");

const statusLabel = computed(() => {
  if (resolvedStatus.value === "maintenance") return "Mantenimiento";
  if (resolvedStatus.value === "active") return "Activa";
  // fallback
  const fromQuery = (route.query.status as string) || "";
  return fromQuery || "Inactiva";
});

async function resolveMachine() {
  try {
    const raw = (await getMachines()) as ApiMachine[];
    type NormalizedMachine = ApiMachine & { id: string; status: string };
    const all: NormalizedMachine[] = raw.map((m) => ({
      ...m,
      id: String(m.id),
      status: String(m.status || "inactive"),
    }));

    const allowed = filterMachinesForRole<NormalizedMachine>(all, {
      role: currentRole.value,
      assignedMachineIds: assignedMachineIds.value,
    });
    const routeId = route.params.id as string | undefined;
    const current = allowed.find(
      (m) => m.name === routeId || String(m.id) === routeId
    );
    if (current) {
      const ok = canAccessMachine({
        role: currentRole.value,
        assignedMachineIds: assignedMachineIds.value,
        machineId: String(current.id),
        machineStatus: String(current.status || "inactive"),
      });
      if (!ok) {
        resolvedMachineId.value = null;
        resolvedStatus.value = "inactive";
        router.replace({ name: "dashboard" });
        return;
      }
      resolvedMachineId.value = String(current.id);
      resolvedStatus.value = String(current.status || "inactive");
      return;
    }
  } catch (e) {
    console.error("Error resolviendo máquina en detalle:", e);
  }

  resolvedMachineId.value = null;
  // Si llegamos aquí, mantenemos un status conservador
  const fromQuery = (route.query.status as string) || "";
  resolvedStatus.value = fromQuery === "Activa" ? "active" : "inactive";
}

const statusMenuOpen = ref(false);

function toggleStatusMenu() {
  if (!isAdmin.value) {
    alert("Solo un administrador puede cambiar el estado de la máquina.");
    return;
  }
  if (!resolvedMachineId.value) return;
  statusMenuOpen.value = !statusMenuOpen.value;
}

async function toggleMaintenance() {
  if (!isAdmin.value) return;
  if (!resolvedMachineId.value) return;

  const newStatus =
    resolvedStatus.value === "maintenance" ? "inactive" : "maintenance";
  try {
    await updateMachine(resolvedMachineId.value, { status: newStatus });
    resolvedStatus.value = newStatus;
  } catch (err) {
    console.error("Error actualizando estado de máquina:", err);
  } finally {
    statusMenuOpen.value = false;
  }
}

function handleGlobalClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return;
  const insideStatus = target.closest("[data-status-menu]");
  if (!insideStatus) statusMenuOpen.value = false;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") statusMenuOpen.value = false;
}

function goBack() {
  router.push({ name: "dashboard" });
}

function refreshPage() {
  window.location.reload();
}

const isActive = (name: string) => route.name === name;

onMounted(() => {
  resolveMachine();
  document.addEventListener("click", handleGlobalClick);
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("click", handleGlobalClick);
  document.removeEventListener("keydown", handleKeydown);
});

watch(
  () => route.params.id,
  () => {
    statusMenuOpen.value = false;
    resolveMachine();
  }
);
</script>

<template>
  <div class="min-h-screen px-3 py-4 sm:px-8 sm:py-6 bg-slate-50">
    <!-- Top bar -->
    <div
      class="relative z-50 mb-4 flex items-center justify-between rounded-2xl border bg-white/60 backdrop-blur-xl px-4 py-3 shadow-sm sm:px-6 border-slate-200/70"
    >
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer border-slate-200"
        @click="goBack"
      >
        <span>←</span>
        <span>Volver</span>
      </button>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium cursor-pointer border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100/60"
          aria-label="Refrescar"
          title="Refrescar"
          @click="refreshPage"
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M21 12a9 9 0 1 1-3.27-6.93"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M21 3v6h-6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <div class="relative" data-status-menu>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium cursor-pointer"
            :class="
              resolvedStatus === 'active'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            "
            :aria-label="`Estado: ${statusLabel}`"
            :title="
              isAdmin
                ? `Estado: ${statusLabel} (toca para opciones)`
                : `Estado: ${statusLabel}`
            "
            @click="toggleStatusMenu"
          >
            <svg
              class="text-xs"
              width="14"
              height="14"
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
          </button>

          <!-- Menú de cambio de estado (solo admin) -->
          <div
            v-if="statusMenuOpen && isAdmin"
            class="absolute right-0 top-11 z-50 w-56 max-w-[90vw] rounded-xl border bg-white/80 backdrop-blur-xl text-xs text-slate-700 shadow-lg border-slate-200/70"
          >
            <p class="px-3 pt-2 pb-1 text-[11px] font-medium text-slate-400">
              Modo mantenimiento
            </p>
            <button
              type="button"
              class="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-slate-50 text-slate-600"
              @click="toggleMaintenance"
            >
              <div class="flex items-center gap-2">
                <span
                  v-if="resolvedStatus === 'maintenance'"
                  class="h-1.5 w-1.5 rounded-full bg-emerald-500"
                ></span>
                <span class="text-[11px]">
                  {{
                    resolvedStatus === "maintenance"
                      ? "Quitar mantenimiento"
                      : "Poner en mantenimiento"
                  }}
                </span>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                class="text-slate-400"
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
              type="button"
              class="w-full px-3 py-1.5 text-left text-[11px] text-slate-400 hover:bg-slate-50"
              @click="statusMenuOpen = false"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Header -->
    <header
      class="mb-4 rounded-2xl border bg-white/60 backdrop-blur-xl px-4 py-4 shadow-sm sm:px-8 border-slate-200/70"
    >
      <h1 class="text-2xl font-semibold">{{ id }}</h1>
      <p class="text-sm text-slate-400">{{ locationText }}</p>

      <!-- Tabs as route links (texto con subrayado en la activa) -->
      <nav
        class="mt-4 flex items-center gap-6 border-b border-slate-200/70 text-sm font-medium text-slate-500"
      >
        <RouterLink
          :to="{
            name: 'machine-resumen',
            params: { id: route.params.id },
            query: route.query,
          }"
          class="relative -mb-px inline-flex cursor-pointer items-center pb-2"
          :class="
            isActive('machine-resumen')
              ? 'text-sky-600 border-b-2 border-sky-500'
              : 'border-b-2 border-transparent hover:text-slate-900 hover:border-slate-300'
          "
        >
          General
        </RouterLink>
        <RouterLink
          :to="{
            name: 'machine-historial',
            params: { id: route.params.id },
            query: route.query,
          }"
          class="relative -mb-px inline-flex cursor-pointer items-center pb-2"
          :class="
            isActive('machine-historial')
              ? 'text-sky-600 border-b-2 border-sky-500'
              : 'border-b-2 border-transparent hover:text-slate-900 hover:border-slate-300'
          "
        >
          Monedas
        </RouterLink>
        <RouterLink
          :to="{
            name: 'machine-estadisticas',
            params: { id: route.params.id },
            query: route.query,
          }"
          class="relative -mb-px inline-flex cursor-pointer items-center pb-2"
          :class="
            isActive('machine-estadisticas')
              ? 'text-sky-600 border-b-2 border-sky-500'
              : 'border-b-2 border-transparent hover:text-slate-900 hover:border-slate-300'
          "
        >
          Tiempos de uso
        </RouterLink>
      </nav>
    </header>

    <RouterView />

    <footer class="mt-6 text-center text-xs text-slate-400">
      © 2025 MachineHub – Detalles de máquina
    </footer>
  </div>
</template>

<style scoped></style>
