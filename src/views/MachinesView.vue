<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppSidebar from "@/components/AppSidebar.vue";
import NewMachine from "@/components/NewMachine.vue";
import MachinesHeader from "@/components/MachinesHeader.vue";
import EditCoinValuesModal from "@/components/EditCoinValuesModal.vue";
import {
  getMachines,
  createMachine,
  updateMachine,
  deleteMachine,
} from "../api/client";
import { useCurrentUser } from "@/composables/useCurrentUser";
import { useTheme } from "@/composables/useTheme";
import { useSearchFilter } from "@/composables/useSearchFilter";
import { filterMachinesForRole } from "@/utils/access";
import { machineStatusDotClass, machineStatusLabel } from "@/utils/machine";

const router = useRouter();
const sidebarOpen = ref(false);

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;

type Machine = { id: string; name: string; status: string; location?: string };
const loading = ref(false);
const machines = ref<Machine[]>([]);
const { currentRole, assignedMachineIds } = useCurrentUser();

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

const statusFilter = ref<"all" | "active" | "inactive" | "maintenance">("all");
const { searchQuery, filterBySearch } = useSearchFilter<Machine>();

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

const isAdmin = computed(
  () => currentRole.value !== "employee" && currentRole.value !== "operator"
);

const isEditPricesOpen = ref(false);

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
});

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
    v-if="isAdmin"
    :open="isEditPricesOpen"
    :dark="isDark()"
    @close="isEditPricesOpen = false"
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
    >
      <template v-if="isAdmin" #summary>
        <div class="flex items-center justify-end">
          <button
            type="button"
            class="h-10 rounded-xl px-4 text-sm font-semibold border transition"
            :class="
              isDark()
                ? 'border-zinc-700/70 bg-zinc-950/20 text-zinc-100 hover:bg-zinc-100/10'
                : 'border-slate-200 bg-white/70 text-slate-800 hover:bg-slate-50'
            "
            @click="isEditPricesOpen = true"
          >
            Editar precios
          </button>
        </div>
      </template>
    </MachinesHeader>

    <section
      class="rounded-2xl border backdrop-blur-xl p-3 shadow-sm sm:p-6"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70 text-zinc-100'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <!-- Toolbar: tabs de estado + buscador -->
      <div
        class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
          <button
            type="button"
            class="px-3 py-1.5 rounded-full border transition font-medium"
            :class="
              statusFilter === 'all'
                ? isDark()
                  ? 'bg-zinc-100/10 text-white border-zinc-400/70'
                  : 'bg-slate-900 text-white border-slate-900'
                : isDark()
                ? 'bg-transparent text-zinc-300 border-zinc-700/60 hover:border-zinc-500/80'
                : 'bg-transparent text-slate-500 border-slate-200 hover:border-slate-400'
            "
            @click="statusFilter = 'all'"
          >
            Todas ({{ totalMachines }})
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-full border transition font-medium"
            :class="
              statusFilter === 'active'
                ? isDark()
                  ? 'bg-zinc-100/10 text-white border-emerald-400'
                  : 'bg-emerald-600 text-white border-emerald-600'
                : isDark()
                ? 'bg-transparent text-zinc-300 border-zinc-700/60 hover:border-zinc-500/80'
                : 'bg-transparent text-slate-500 border-slate-200 hover:border-slate-400'
            "
            @click="statusFilter = 'active'"
          >
            Activas ({{ activeMachines }})
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-full border transition font-medium"
            :class="
              statusFilter === 'inactive'
                ? isDark()
                  ? 'bg-zinc-100/10 text-white border-red-400'
                  : 'bg-red-500 text-white border-red-500'
                : isDark()
                ? 'bg-transparent text-zinc-300 border-zinc-700/60 hover:border-zinc-500/80'
                : 'bg-transparent text-slate-500 border-slate-200 hover:border-slate-400'
            "
            @click="statusFilter = 'inactive'"
          >
            Inactivas ({{ inactiveMachines }})
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-full border transition font-medium"
            :class="
              statusFilter === 'maintenance'
                ? isDark()
                  ? 'bg-zinc-100/10 text-white border-amber-400'
                  : 'bg-amber-500 text-white border-amber-500'
                : isDark()
                ? 'bg-transparent text-zinc-300 border-zinc-700/60 hover:border-zinc-500/80'
                : 'bg-transparent text-slate-500 border-slate-200 hover:border-slate-400'
            "
            @click="statusFilter = 'maintenance'"
          >
            Mantenimiento ({{ maintenanceMachines }})
          </button>
        </div>

        <div class="w-full sm:w-64 relative">
          <span
            class="pointer-events-none absolute inset-y-0 left-2 flex items-center text-slate-400"
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
            placeholder="Buscar por ID, nombre o ubicación"
            class="w-full rounded-full border px-7 py-1.5 text-xs placeholder-slate-400 focus:outline-none focus:ring-2"
            :class="
              isDark()
                ? 'bg-zinc-950/20 text-zinc-100 border-zinc-700/60 placeholder-zinc-500 focus:ring-zinc-400/40 focus:border-zinc-500'
                : 'bg-white/90 text-slate-800 border-slate-200'
            "
          />
        </div>
      </div>

      <!-- Desktop table (hidden on small screens) -->
      <div
        class="hidden sm:block overflow-x-auto rounded-2xl border shadow-sm"
        :class="
          isDark()
            ? 'border-zinc-800/70 bg-zinc-900/60 backdrop-blur-xl'
            : 'border-slate-200/70 bg-white/50 backdrop-blur-xl'
        "
      >
        <table
          class="min-w-full text-left text-sm"
          :class="isDark() ? 'text-zinc-100' : 'text-slate-900'"
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
            <tr v-else-if="!filteredMachines.length">
              <td class="px-4 py-10" colspan="5">
                <div
                  class="mx-auto max-w-md rounded-2xl border px-4 py-6 text-center text-sm shadow-sm backdrop-blur-xl"
                  :class="
                    isDark()
                      ? 'border-zinc-800/70 bg-zinc-900/50 text-zinc-200'
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
              v-for="m in filteredMachines"
              :key="m.id"
              class="border-t transition-colors"
              :class="
                isDark()
                  ? 'border-zinc-800/70 hover:bg-red-500/10'
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
                      ? 'bg-zinc-800/60 text-zinc-200'
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
        <div v-else-if="!filteredMachines.length" class="px-4 py-10">
          <div
            class="rounded-2xl border px-4 py-6 text-center text-sm shadow-sm backdrop-blur-xl"
            :class="
              isDark()
                ? 'border-zinc-800/70 bg-zinc-900/20 text-zinc-200'
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
            v-for="m in filteredMachines"
            :key="m.id"
            class="rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-xl cursor-pointer"
            :class="
              isDark()
                ? 'border-zinc-800/70 bg-zinc-900/30'
                : 'border-slate-200/70 bg-white/60'
            "
            role="link"
            tabindex="0"
            @click="openMachineDetail(m)"
            @keydown.enter.prevent="openMachineDetail(m)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1">
                <div class="flex items-center gap-2 min-w-0">
                  <span
                    class="h-2.5 w-2.5 rounded-full"
                    :class="machineStatusDotClass(m.status)"
                    aria-hidden="true"
                  ></span>
                  <div class="min-w-0">
                    <div class="text-base font-semibold leading-tight truncate">
                      {{ m.name }}
                      <span
                        class="ml-1 text-xs font-medium"
                        :class="isDark() ? 'text-zinc-300' : 'text-slate-500'"
                        >({{ machineStatusLabel(m.status) }})</span
                      >
                    </div>
                    <div
                      class="mt-0.5 text-xs"
                      :class="isDark() ? 'text-zinc-300' : 'text-slate-500'"
                    >
                      {{ m.location || "—" }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex flex-col items-end">
                <div class="mt-2">
                  <button
                    v-if="
                      currentRole !== 'employee' && currentRole !== 'operator'
                    "
                    class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-amber-600 transition hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                    @click.stop.prevent="openEditModal(m)"
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
                  @click.stop.prevent="handleDeleteMachine(m.id)"
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
