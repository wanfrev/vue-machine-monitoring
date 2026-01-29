<script setup lang="ts">
import { inject, type Ref, computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppSidebar from "@/components/AppSidebar.vue";
import NewMachine from "@/components/NewMachine.vue";
import {
  getMachines,
  createMachine,
  updateMachine,
  deleteMachine,
} from "../api/client";
import {
  filterMachinesForRole,
  getAssignedMachineIdsFromStorage,
} from "@/utils/access";

const router = useRouter();
const sidebarOpen = ref(false);

const injectedDark = inject<Ref<boolean> | boolean>("darkMode", false);
const isDark = () => {
  if (typeof injectedDark === "boolean") return injectedDark;
  return !!injectedDark?.value;
};

type Machine = { id: string; name: string; status: string; location?: string };
const loading = ref(false);
const machines = ref<Machine[]>([]);

const assignedMachineIds = ref<string[]>(getAssignedMachineIdsFromStorage());

const scopedMachines = computed(() =>
  filterMachinesForRole(machines.value, {
    role: currentRole.value,
    assignedMachineIds: assignedMachineIds.value,
  })
);

const totalMachines = computed(() => scopedMachines.value.length);
const activeMachines = computed(
  () => scopedMachines.value.filter((m) => m.status === "active").length
);
const inactiveMachines = computed(
  () => scopedMachines.value.filter((m) => m.status === "inactive").length
);
const maintenanceMachines = computed(
  () => scopedMachines.value.filter((m) => m.status === "maintenance").length
);

const showModal = ref(false);
const modalMode = ref<"create" | "edit">("create");
const machineToEdit = ref<Machine | null>(null);

// Obtener el rol del usuario desde localStorage
const currentRole = ref(localStorage.getItem("role") || "");

async function loadMachines() {
  loading.value = true;
  try {
    machines.value = await getMachines();
  } finally {
    loading.value = false;
  }
}

onMounted(loadMachines);

async function refreshPage() {
  await loadMachines();
}

function openCreateModal() {
  modalMode.value = "create";
  machineToEdit.value = null;
  showModal.value = true;
}

function openEditModal(machine: Machine) {
  modalMode.value = "edit";
  machineToEdit.value = machine;
  showModal.value = true;
}

async function handleCreateMachine(payload: {
  name: string;
  location: string;
  type?: string;
}) {
  await createMachine({
    name: payload.name,
    location: payload.location,
    type: payload.type,
  });
  await loadMachines();
}

async function handleUpdateMachine(payload: {
  id: string;
  location?: string;
  name?: string;
  type?: string;
}) {
  await updateMachine(payload.id, {
    location: payload.location,
    name: payload.name,
    type: payload.type,
  });
  await loadMachines();
}

async function handleDeleteMachine(id: string) {
  const ok = window.confirm("¿Seguro que deseas eliminar esta máquina?");
  if (!ok) return;
  await deleteMachine(id);
  await loadMachines();
}
</script>

<template>
  <AppSidebar
    :open="sidebarOpen"
    :dark="isDark()"
    @close="sidebarOpen = false"
  />
  <!-- Modal solo visible para admins -->
  <NewMachine
    v-if="currentRole !== 'employee' && currentRole !== 'operator'"
    :open="showModal"
    :count="machines.length"
    :dark="isDark()"
    :machines="machines"
    :mode="modalMode"
    :machine-to-edit="machineToEdit || undefined"
    @close="showModal = false"
    @create="handleCreateMachine"
    @update="handleUpdateMachine"
  />
  <div
    :class="[
      'min-h-screen px-3 py-4 sm:px-8 sm:py-6 space-y-6',
      isDark() ? 'bg-slate-900' : 'bg-slate-50',
    ]"
  >
    <header
      class="flex flex-col gap-4 rounded-2xl border bg-white/60 backdrop-blur-xl px-4 py-4 shadow-sm sm:px-8 sm:py-5"
      :class="
        isDark()
          ? 'bg-slate-900/40 border-slate-700/60 text-white'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div class="flex items-start justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-full border text-slate-500 transition cursor-pointer group overflow-hidden"
              :class="
                isDark()
                  ? 'border-red-300 hover:bg-transparent hover:text-white'
                  : 'border-red-200 hover:bg-transparent hover:text-red-700'
              "
              aria-label="Abrir menú lateral"
              @click="sidebarOpen = true"
            >
              <img
                src="/img/icons/K11BOX.webp"
                alt="MachineHub logo"
                class="h-full w-full object-cover rounded-full transition-transform duration-200 group-hover:scale-105 group-hover:shadow-lg"
              />
            </button>
            <h1 class="text-xl font-semibold sm:text-2xl">Máquinas</h1>
          </div>
          <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
            Gestión
          </p>
          <p
            class="text-sm"
            :class="isDark() ? 'text-slate-300' : 'text-slate-500'"
          >
            Administración y estado de máquinas.
          </p>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full border transition cursor-pointer"
            :class="
              isDark()
                ? 'border-red-400/30 bg-red-950/10 text-red-100 hover:bg-red-950/20'
                : 'border-red-200/80 bg-red-50/60 text-red-700 hover:bg-red-50/80'
            "
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

          <button
            v-if="currentRole !== 'employee' && currentRole !== 'operator'"
            type="button"
            class="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:text-sm cursor-pointer whitespace-nowrap"
            @click="openCreateModal"
          >
            <span class="mr-1">+</span>
            <span>Nueva máquina</span>
          </button>
        </div>
      </div>

      <div
        class="grid grid-cols-2 gap-3 pt-2 auto-rows-fr sm:grid-cols-2 lg:grid-cols-4"
      >
        <div
          class="rounded-2xl border px-4 py-3 text-sm shadow-sm backdrop-blur-xl"
          :class="
            isDark()
              ? 'border-slate-700/60 bg-slate-900/30 text-slate-100'
              : 'border-slate-200/70 bg-white/50 text-slate-700'
          "
        >
          <p
            class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
          >
            Total
          </p>
          <p class="text-2xl font-semibold">{{ totalMachines }}</p>
        </div>

        <div
          class="rounded-2xl border px-4 py-3 text-sm shadow-sm backdrop-blur-xl"
          :class="
            isDark()
              ? 'border-green-900/60 bg-green-950/40 text-green-200'
              : 'border-green-100/80 bg-green-50/60 text-green-700'
          "
        >
          <p
            class="mb-1 text-xs font-medium uppercase tracking-wide text-emerald-500"
          >
            Activas
          </p>
          <p class="text-2xl font-semibold text-emerald-600">
            {{ activeMachines }}
          </p>
        </div>

        <div
          class="rounded-2xl border px-4 py-3 text-sm shadow-sm backdrop-blur-xl"
          :class="
            isDark()
              ? 'border-red-900/60 bg-red-950/40 text-red-200'
              : 'border-red-100/80 bg-red-50/60 text-red-700'
          "
        >
          <p
            class="mb-1 text-xs font-medium uppercase tracking-wide text-red-400"
          >
            Inactivas
          </p>
          <p class="text-2xl font-semibold text-red-600">
            {{ inactiveMachines }}
          </p>
        </div>

        <div
          class="rounded-2xl border px-4 py-3 text-sm shadow-sm backdrop-blur-xl"
          :class="
            isDark()
              ? 'border-slate-700/60 bg-slate-950/30 text-slate-200'
              : 'border-slate-200/70 bg-white/50 text-slate-700'
          "
        >
          <p
            class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
          >
            Mantenimiento
          </p>
          <p class="text-2xl font-semibold">{{ maintenanceMachines }}</p>
        </div>
      </div>
    </header>

    <section
      class="rounded-2xl border bg-white/60 backdrop-blur-xl p-3 shadow-sm sm:p-6"
      :class="
        isDark()
          ? 'bg-slate-900/40 border-slate-700/60 text-slate-100'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <!-- Desktop table (hidden on small screens) -->
      <div
        class="hidden sm:block overflow-x-auto rounded-2xl border shadow-sm"
        :class="
          isDark()
            ? 'border-slate-700/60 bg-slate-900/20 backdrop-blur-xl'
            : 'border-slate-200/70 bg-white/50 backdrop-blur-xl'
        "
      >
        <table
          class="min-w-full text-left text-sm"
          :class="isDark() ? 'text-slate-100' : 'text-slate-900'"
        >
          <thead
            :class="
              isDark()
                ? 'bg-red-900/20 backdrop-blur text-slate-200'
                : 'bg-red-50/70 backdrop-blur text-slate-700'
            "
          >
            <tr>
              <th class="px-4 py-2 whitespace-nowrap">ID</th>
              <th class="px-4 py-2 whitespace-nowrap">Nombre</th>
              <th class="px-4 py-2 whitespace-nowrap">Estado</th>
              <th class="px-4 py-2 whitespace-nowrap">OEE</th>
              <th class="px-4 py-2 text-right whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td class="px-4 py-3" colspan="5">Cargando...</td>
            </tr>
            <tr v-else-if="!scopedMachines.length">
              <td class="px-4 py-10" colspan="5">
                <div
                  class="mx-auto max-w-md rounded-2xl border px-4 py-6 text-center text-sm shadow-sm backdrop-blur-xl"
                  :class="
                    isDark()
                      ? 'border-slate-700/60 bg-slate-900/20 text-slate-200'
                      : 'border-slate-200/70 bg-white/50 text-slate-600'
                  "
                >
                  <p class="text-base font-semibold">Sin máquinas</p>
                  <p class="mt-1 text-xs text-slate-400">
                    Cuando registres máquinas, aparecerán aquí.
                  </p>
                </div>
              </td>
            </tr>
            <tr
              v-for="m in scopedMachines"
              :key="m.id"
              class="border-t transition-colors"
              :class="
                isDark()
                  ? 'border-slate-800/70 hover:bg-red-500/10'
                  : 'border-slate-200/70 hover:bg-red-100/50'
              "
            >
              <td class="px-4 py-2 whitespace-nowrap">{{ m.id }}</td>
              <td class="px-4 py-2 whitespace-nowrap">{{ m.name }}</td>
              <td class="px-4 py-2 whitespace-nowrap">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                  :class="
                    m.status === 'active'
                      ? isDark()
                        ? 'bg-green-900/60 text-green-200'
                        : 'bg-green-100 text-green-700'
                      : m.status === 'maintenance'
                      ? isDark()
                        ? 'bg-amber-900/60 text-amber-200'
                        : 'bg-amber-100 text-amber-700'
                      : isDark()
                      ? 'bg-slate-800/70 text-slate-200'
                      : 'bg-slate-100 text-slate-700'
                  "
                >
                  {{
                    m.status === "active"
                      ? "Activa"
                      : m.status === "maintenance"
                      ? "Mantenimiento"
                      : "Inactiva"
                  }}
                </span>
              </td>
              <td class="px-4 py-2 whitespace-nowrap">—</td>
              <td
                class="px-4 py-2 text-right text-sm space-x-2 whitespace-nowrap"
              >
                <template
                  v-if="
                    currentRole !== 'employee' && currentRole !== 'operator'
                  "
                >
                  <button
                    class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-amber-600 transition hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                    type="button"
                    @click="openEditModal(m)"
                  >
                    Editar
                  </button>
                  <button
                    class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
                    type="button"
                    @click="handleDeleteMachine(m.id)"
                  >
                    Eliminar
                  </button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile list (visible on small screens) -->
      <div class="sm:hidden space-y-3">
        <div v-if="loading" class="px-4 py-3">Cargando...</div>
        <div v-else-if="!scopedMachines.length" class="px-4 py-10">
          <div
            class="rounded-2xl border px-4 py-6 text-center text-sm shadow-sm backdrop-blur-xl"
            :class="
              isDark()
                ? 'border-slate-700/60 bg-slate-900/20 text-slate-200'
                : 'border-slate-200/70 bg-white/50 text-slate-600'
            "
          >
            <p class="text-base font-semibold">Sin máquinas</p>
            <p class="mt-1 text-xs text-slate-400">
              Cuando registres máquinas, aparecerán aquí.
            </p>
          </div>
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="m in scopedMachines"
            :key="m.id"
            class="rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-xl"
            :class="
              isDark()
                ? 'border-slate-700/60 bg-slate-900/30'
                : 'border-slate-200/70 bg-white/60'
            "
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1">
                <div class="text-sm font-semibold">{{ m.name }}</div>
                <div class="mt-1 flex flex-wrap items-center gap-2">
                  <span class="text-xs text-slate-400">{{ m.id }}</span>
                  <span
                    v-if="m.location"
                    class="inline-flex max-w-full items-start gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                    :class="
                      isDark()
                        ? 'border-slate-700/60 bg-slate-950/20 text-slate-200'
                        : 'border-slate-200/70 bg-white/40 text-slate-700'
                    "
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                      class="text-red-600"
                    >
                      <path
                        d="M12 22s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    <span class="whitespace-normal break-words">{{
                      m.location
                    }}</span>
                  </span>
                  <span v-else class="text-xs text-slate-400">—</span>
                </div>
              </div>
              <div class="flex flex-col items-end">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                  :class="
                    m.status === 'active'
                      ? isDark()
                        ? 'bg-green-900/60 text-green-200'
                        : 'bg-green-100 text-green-700'
                      : m.status === 'maintenance'
                      ? isDark()
                        ? 'bg-amber-900/60 text-amber-200'
                        : 'bg-amber-100 text-amber-700'
                      : isDark()
                      ? 'bg-slate-800/70 text-slate-200'
                      : 'bg-slate-100 text-slate-700'
                  "
                >
                  {{
                    m.status === "active"
                      ? "Activa"
                      : m.status === "maintenance"
                      ? "Mantenimiento"
                      : "Inactiva"
                  }}
                </span>
                <div class="mt-2">
                  <button
                    v-if="
                      currentRole !== 'employee' && currentRole !== 'operator'
                    "
                    class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-amber-600 transition hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                    @click="openEditModal(m)"
                  >
                    Editar
                  </button>
                </div>
              </div>
            </div>

            <div
              class="mt-3 flex items-center justify-between text-xs text-slate-500"
            >
              <div>OEE: —</div>
              <div class="flex items-center gap-3">
                <button
                  v-if="
                    currentRole !== 'employee' && currentRole !== 'operator'
                  "
                  class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
                  type="button"
                  @click="handleDeleteMachine(m.id)"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
