<script setup lang="ts">
/* global defineProps */
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppSidebar from "@/components/AppSidebar.vue";
import NewMachine from "@/components/NewMachine.vue";
import MachinesHeader from "@/components/MachinesHeader.vue";
import EditCoinValuesModal from "@/components/EditCoinValuesModal.vue";
import EditExchangeRateModal from "@/components/EditExchangeRateModal.vue";
import {
  getMachines,
  createMachine,
  updateMachine,
  deleteMachine,
} from "../api/client";
import { useTheme } from "@/composables/useTheme";
import { useSearchFilter } from "@/composables/useSearchFilter";
import { useCurrentUser } from "@/composables/useCurrentUser";
import { filterMachinesForRole } from "@/utils/access";
import { machineStatusLabel } from "@/utils/machine";

type Machine = { id: string; name: string; status: string; location?: string };

type Props = {
  currentRole: string;
  assignedMachineIds: string[];
  canEditMachines: boolean;
  canEditCoinValues: boolean;
  canEditExchangeRate: boolean;
};

const props = defineProps<Props>();

const router = useRouter();
const sidebarOpen = ref(false);
const { canManage } = useCurrentUser();

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;

const loading = ref(false);
const machines = ref<Machine[]>([]);

const scopedMachines = computed(() =>
  filterMachinesForRole(machines.value, {
    role: props.currentRole,
    assignedMachineIds: props.assignedMachineIds,
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

const statusFilter = ref<"all" | "active" | "inactive" | "maintenance">("all");
const { searchQuery, filterBySearch } = useSearchFilter<Machine>();

const actionMenuOpenId = ref<string | null>(null);

function toggleActionMenu(machineId: string) {
  actionMenuOpenId.value =
    actionMenuOpenId.value === machineId ? null : machineId;
}

function closeActionMenu() {
  actionMenuOpenId.value = null;
}

const filteredMachines = computed(() => {
  let list = scopedMachines.value
    .slice()
    .sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" })
    );

  if (statusFilter.value === "active") {
    list = list.filter((m) => m.status === "active");
  } else if (statusFilter.value === "inactive") {
    list = list.filter((m) => m.status === "inactive");
  } else if (statusFilter.value === "maintenance") {
    list = list.filter((m) => m.status === "maintenance");
  }

  list = filterBySearch(list, (m) =>
    `${m.name} ${m.id} ${m.location || ""}`.trim()
  );

  return list;
});

const showModal = ref(false);
const modalMode = ref<"create" | "edit">("create");
const machineToEdit = ref<Machine | null>(null);

const isEditPricesOpen = ref(false);
const isEditExchangeRateOpen = ref(false);

async function loadMachines() {
  loading.value = true;
  try {
    machines.value = await getMachines();
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadMachines();
  window.addEventListener("click", handleGlobalClick);
});

onUnmounted(() => {
  window.removeEventListener("click", handleGlobalClick);
});

function handleGlobalClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return;
  const insideMenu = target.closest("[data-action-menu]");
  if (!insideMenu) {
    actionMenuOpenId.value = null;
  }
}

function refreshPage() {
  window.location.reload();
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

function openMachineDetail(machine: Machine) {
  const query: Record<string, string> = {
    status: machineStatusLabel(machine.status),
  };
  if (machine.location) query.location = machine.location;
  router.push({ name: "machine-resumen", params: { id: machine.name }, query });
}
</script>

<template>
  <AppSidebar
    :open="sidebarOpen"
    :dark="isDark()"
    @close="sidebarOpen = false"
  />

  <EditCoinValuesModal
    v-if="canEditCoinValues"
    :open="isEditPricesOpen"
    :dark="isDark()"
    @close="isEditPricesOpen = false"
  />
  <EditExchangeRateModal
    v-if="canEditExchangeRate"
    :open="isEditExchangeRateOpen"
    :dark="isDark()"
    @close="isEditExchangeRateOpen = false"
  />

  <NewMachine
    v-if="canEditMachines"
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
      'min-h-screen px-3 py-4 sm:px-6 lg:px-8 space-y-5',
      isDark() ? 'bg-zinc-950' : 'bg-slate-100',
    ]"
  >
    <MachinesHeader
      :sidebar-open="sidebarOpen"
      :total-machines="totalMachines"
      :active-machines="activeMachines"
      :inactive-machines="inactiveMachines"
      :maintenance-machines="maintenanceMachines"
      :current-role="currentRole"
      @update:sidebarOpen="(val) => (sidebarOpen = val)"
      @refresh="refreshPage"
      @create="openCreateModal"
    />

    <!-- Admin actions -->
    <div
      v-if="canManage && (canEditCoinValues || canEditExchangeRate)"
      class="flex items-center justify-end gap-2"
    >
      <button
        v-if="canEditExchangeRate"
        type="button"
        class="inline-flex items-center gap-2 h-10 rounded-xl px-4 text-sm font-semibold border transition"
        :class="
          isDark()
            ? 'border-zinc-700/70 bg-zinc-900/50 text-zinc-100 hover:bg-zinc-800'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        "
        @click="isEditExchangeRateOpen = true"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
        Editar tasa
      </button>
      <button
        v-if="canEditCoinValues"
        type="button"
        class="inline-flex items-center gap-2 h-10 rounded-xl px-4 text-sm font-semibold border transition"
        :class="
          isDark()
            ? 'border-zinc-700/70 bg-zinc-900/50 text-zinc-100 hover:bg-zinc-800'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        "
        @click="isEditPricesOpen = true"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Editar precios
      </button>
    </div>

    <!-- Main content section -->
    <section
      class="rounded-2xl border backdrop-blur-xl p-4 shadow-sm sm:p-6"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-zinc-100'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <!-- Filters bar -->
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition border"
            :class="
              statusFilter === 'all'
                ? isDark()
                  ? 'bg-zinc-100/10 text-white border-zinc-500/70'
                  : 'bg-slate-900 text-white border-slate-900'
                : isDark()
                ? 'bg-transparent text-zinc-400 border-zinc-700/60 hover:border-zinc-500 hover:text-zinc-200'
                : 'bg-transparent text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
            "
            @click="statusFilter = 'all'"
          >
            Todas
            <span class="ml-1 opacity-60">{{ totalMachines }}</span>
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition border"
            :class="
              statusFilter === 'active'
                ? isDark()
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/50'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isDark()
                ? 'bg-transparent text-zinc-400 border-zinc-700/60 hover:border-zinc-500 hover:text-zinc-200'
                : 'bg-transparent text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
            "
            @click="statusFilter = 'active'"
          >
            Activas
            <span class="ml-1 opacity-60">{{ activeMachines }}</span>
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition border"
            :class="
              statusFilter === 'inactive'
                ? isDark()
                  ? 'bg-red-500/15 text-red-300 border-red-500/50'
                  : 'bg-red-50 text-red-700 border-red-200'
                : isDark()
                ? 'bg-transparent text-zinc-400 border-zinc-700/60 hover:border-zinc-500 hover:text-zinc-200'
                : 'bg-transparent text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
            "
            @click="statusFilter = 'inactive'"
          >
            Inactivas
            <span class="ml-1 opacity-60">{{ inactiveMachines }}</span>
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition border"
            :class="
              statusFilter === 'maintenance'
                ? isDark()
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/50'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
                : isDark()
                ? 'bg-transparent text-zinc-400 border-zinc-700/60 hover:border-zinc-500 hover:text-zinc-200'
                : 'bg-transparent text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
            "
            @click="statusFilter = 'maintenance'"
          >
            Mantenimiento
            <span class="ml-1 opacity-60">{{ maintenanceMachines }}</span>
          </button>
        </div>

        <div class="w-full sm:w-72">
          <div class="relative">
            <span
              class="pointer-events-none absolute inset-y-0 left-3 flex items-center"
              :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="m20 20-3.5-3.5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Buscar maquina..."
              class="w-full h-10 rounded-xl border pl-10 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
              :class="
                isDark()
                  ? 'bg-zinc-950/40 border-zinc-700/60 text-white placeholder-zinc-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
              "
            />
          </div>
        </div>
      </div>

      <!-- Desktop Table -->
      <div
        class="hidden sm:block mt-5 overflow-x-auto rounded-xl border shadow-sm"
        :class="
          isDark()
            ? 'border-zinc-800/70 bg-zinc-900/40'
            : 'border-slate-200/70 bg-white/50'
        "
      >
        <table
          class="min-w-full text-left text-sm"
          :class="isDark() ? 'text-zinc-100' : 'text-slate-900'"
        >
          <thead
            :class="
              isDark()
                ? 'bg-zinc-800/50 text-zinc-300'
                : 'bg-slate-50 text-slate-600'
            "
          >
            <tr>
              <th
                class="px-5 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
              >
                Nombre
              </th>
              <th
                class="px-5 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
              >
                Estado
              </th>
              <th
                class="px-5 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
              >
                Ubicacion
              </th>
              <th
                class="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-right whitespace-nowrap"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td class="px-5 py-6 text-center" colspan="4">
                <div
                  class="flex items-center justify-center gap-2"
                  :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >
                  <svg
                    class="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Cargando maquinas...
                </div>
              </td>
            </tr>
            <tr v-else-if="!filteredMachines.length">
              <td class="px-5 py-12 text-center" colspan="4">
                <div
                  class="mx-auto max-w-sm rounded-2xl border px-6 py-8 text-center"
                  :class="
                    isDark()
                      ? 'border-zinc-800/70 bg-zinc-900/50'
                      : 'border-slate-200/70 bg-white/50'
                  "
                >
                  <svg
                    class="mx-auto h-10 w-10 mb-3"
                    :class="isDark() ? 'text-zinc-600' : 'text-slate-300'"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <p
                    class="text-sm font-semibold"
                    :class="isDark() ? 'text-zinc-300' : 'text-slate-700'"
                  >
                    Sin maquinas
                  </p>
                  <p
                    class="mt-1 text-xs"
                    :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
                  >
                    Cuando registres maquinas, apareceran aqui.
                  </p>
                </div>
              </td>
            </tr>
            <tr
              v-for="m in filteredMachines"
              :key="m.id"
              class="border-t transition-colors"
              :class="
                isDark()
                  ? 'border-zinc-800/50 hover:bg-zinc-800/30'
                  : 'border-slate-100 hover:bg-slate-50'
              "
            >
              <td class="px-5 py-3 whitespace-nowrap">
                <span class="font-medium">{{ m.name }}</span>
              </td>
              <td class="px-5 py-3 whitespace-nowrap">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="
                    m.status === 'active'
                      ? isDark()
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-emerald-50 text-emerald-700'
                      : m.status === 'maintenance'
                      ? isDark()
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-amber-50 text-amber-700'
                      : isDark()
                      ? 'bg-zinc-800/60 text-zinc-400'
                      : 'bg-slate-100 text-slate-600'
                  "
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full"
                    :class="
                      m.status === 'active'
                        ? 'bg-emerald-400'
                        : m.status === 'maintenance'
                        ? 'bg-amber-400'
                        : 'bg-zinc-400'
                    "
                  ></span>
                  {{
                    m.status === "active"
                      ? "Activa"
                      : m.status === "maintenance"
                      ? "Mantenimiento"
                      : "Inactiva"
                  }}
                </span>
              </td>
              <td class="px-5 py-3 whitespace-nowrap">
                <span
                  class="text-xs"
                  :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                  >{{ m.location || "—" }}</span
                >
              </td>
              <td class="px-5 py-3 text-right whitespace-nowrap">
                <template v-if="canEditMachines">
                  <div class="relative inline-block">
                    <button
                      class="inline-flex h-8 w-8 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40"
                      :class="
                        isDark()
                          ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                      "
                      type="button"
                      @click="toggleActionMenu(m.id)"
                    >
                      <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                    <div
                      v-if="actionMenuOpenId === m.id"
                      class="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border py-1 shadow-lg"
                      :class="
                        isDark()
                          ? 'border-zinc-700/70 bg-zinc-900'
                          : 'border-slate-200 bg-white'
                      "
                      data-action-menu
                    >
                      <button
                        class="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition"
                        :class="
                          isDark()
                            ? 'text-zinc-200 hover:bg-zinc-800'
                            : 'text-slate-700 hover:bg-slate-50'
                        "
                        type="button"
                        @click.stop="
                          openEditModal(m);
                          closeActionMenu();
                        "
                      >
                        <svg
                          class="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Editar
                      </button>
                      <button
                        class="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition"
                        :class="
                          isDark()
                            ? 'text-red-400 hover:bg-red-500/10'
                            : 'text-red-600 hover:bg-red-50'
                        "
                        type="button"
                        @click.stop="
                          handleDeleteMachine(m.id);
                          closeActionMenu();
                        "
                      >
                        <svg
                          class="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile list -->
      <div class="sm:hidden mt-5">
        <div
          v-if="loading"
          class="px-4 py-6 text-center"
          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
        >
          <svg
            class="mx-auto animate-spin h-6 w-6 mb-2"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Cargando...
        </div>
        <div v-else-if="!filteredMachines.length" class="px-4 py-10">
          <div
            class="rounded-2xl border px-6 py-8 text-center"
            :class="
              isDark()
                ? 'border-zinc-800/70 bg-zinc-900/20'
                : 'border-slate-200/70 bg-white/50'
            "
          >
            <svg
              class="mx-auto h-10 w-10 mb-3"
              :class="isDark() ? 'text-zinc-600' : 'text-slate-300'"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <p
              class="text-sm font-semibold"
              :class="isDark() ? 'text-zinc-300' : 'text-slate-700'"
            >
              Sin maquinas
            </p>
            <p
              class="mt-1 text-xs"
              :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
            >
              Cuando registres maquinas, apareceran aqui.
            </p>
          </div>
        </div>
        <div v-else>
          <div
            v-for="(m, idx) in filteredMachines"
            :key="m.id"
            class="flex items-center justify-between px-4 py-3"
            :class="[
              idx < filteredMachines.length - 1
                ? isDark()
                  ? 'border-b border-zinc-800/40'
                  : 'border-b border-slate-200/60'
                : '',
            ]"
            role="link"
            tabindex="0"
            @click="openMachineDetail(m)"
            @keydown.enter.prevent="openMachineDetail(m)"
          >
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <span
                class="h-2.5 w-2.5 rounded-full shrink-0"
                :class="
                  m.status === 'active'
                    ? 'bg-emerald-400'
                    : m.status === 'maintenance'
                    ? 'bg-amber-400'
                    : 'bg-zinc-400'
                "
                aria-hidden="true"
              ></span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-sm font-semibold truncate">{{
                    m.name
                  }}</span>
                  <span
                    class="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                    :class="
                      m.status === 'active'
                        ? isDark()
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-emerald-50 text-emerald-600'
                        : m.status === 'maintenance'
                        ? isDark()
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-amber-50 text-amber-600'
                        : isDark()
                        ? 'bg-zinc-800 text-zinc-400'
                        : 'bg-slate-100 text-slate-500'
                    "
                  >
                    {{
                      m.status === "active"
                        ? "Activa"
                        : m.status === "maintenance"
                        ? "Mant."
                        : "Inactiva"
                    }}
                  </span>
                </div>
                <div
                  class="text-xs truncate"
                  :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >
                  {{ m.location || "Sin ubicacion" }}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0 ml-2">
              <template v-if="canEditMachines">
                <div class="relative">
                  <button
                    class="inline-flex h-7 w-7 items-center justify-center rounded-lg transition"
                    :class="
                      isDark()
                        ? 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                    "
                    type="button"
                    @click.stop.prevent="toggleActionMenu(m.id)"
                  >
                    <svg
                      class="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>
                  <div
                    v-if="actionMenuOpenId === m.id"
                    class="absolute right-0 bottom-full z-20 mb-1 w-40 rounded-xl border py-1 shadow-lg"
                    :class="
                      isDark()
                        ? 'border-zinc-700/70 bg-zinc-900'
                        : 'border-slate-200 bg-white'
                    "
                    data-action-menu
                  >
                    <button
                      class="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition"
                      :class="
                        isDark()
                          ? 'text-zinc-200 hover:bg-zinc-800'
                          : 'text-slate-700 hover:bg-slate-50'
                      "
                      type="button"
                      @click.stop="
                        openEditModal(m);
                        closeActionMenu();
                      "
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Editar
                    </button>
                    <button
                      class="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition"
                      :class="
                        isDark()
                          ? 'text-red-400 hover:bg-red-500/10'
                          : 'text-red-600 hover:bg-red-50'
                      "
                      type="button"
                      @click.stop="
                        handleDeleteMachine(m.id);
                        closeActionMenu();
                      "
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Eliminar
                    </button>
                  </div>
                </div>
              </template>
              <svg
                class="h-4 w-4 shrink-0"
                :class="isDark() ? 'text-zinc-600' : 'text-slate-300'"
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
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
