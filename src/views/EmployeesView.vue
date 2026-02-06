<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import { ref as vueRef } from "vue";
const sidebarOpen = vueRef(false);
import { computed, onMounted, ref } from "vue";
import NewEmployee from "@/components/NewEmployee.vue";
import { getUsers, createUser, deleteUser, getMachines } from "../api/client";
import { useTheme } from "@/composables/useTheme";
import { useSearchFilter } from "@/composables/useSearchFilter";

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;

type Employee = {
  id: number;
  username: string;
  role: string;
  name: string;
  shift?: string;
  documentId?: string;
  jobRole?: string;
  assignedMachineIds?: string[];
};

type SimpleMachine = { id: string; name: string; location?: string };

const employees = ref<Employee[]>([]);
const machines = ref<SimpleMachine[]>([]);
const loading = ref(false);
const showModal = ref(false);
const modalMode = ref<"create" | "edit">("create");
const employeeToEdit = ref<Employee | null>(null);

const totalPeople = computed(
  () =>
    employees.value.filter(
      (e) => e.role === "employee" || e.role === "operator"
    ).length
);
const totalOperators = computed(
  () => employees.value.filter((e) => e.role === "operator").length
);
const totalEmployees = computed(
  () => employees.value.filter((e) => e.role === "employee").length
);

type PeopleFilter = "todos" | "supervisores" | "operadores";
const peopleFilter = ref<PeopleFilter>("todos");
const { searchQuery, filterBySearch } = useSearchFilter<Employee>();

type ApiMachine = {
  id: number | string;
  name: string;
  location?: string | null;
};

const displayedEmployees = computed(() => {
  // Solo mostramos supervisores y operadores (no admins)
  let list = employees.value.filter(
    (e) => e.role === "employee" || e.role === "operator"
  );

  if (peopleFilter.value === "supervisores") {
    list = list.filter((e) => e.role === "employee");
  } else if (peopleFilter.value === "operadores") {
    list = list.filter((e) => e.role === "operator");
  }

  list = filterBySearch(list, (e) =>
    `${e.name || ""} ${e.username || ""} ${e.documentId || ""}`.trim()
  );

  return list.slice().sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "es", {
      sensitivity: "base",
    })
  );
});

const emptyTitle = computed(() =>
  peopleFilter.value === "operadores"
    ? "Sin operadores"
    : peopleFilter.value === "supervisores"
    ? "Sin supervisores"
    : "Sin personal"
);

const emptySubtitle = computed(() => "Crea el primero para que aparezca aquí.");

async function loadEmployees() {
  loading.value = true;
  try {
    employees.value = await getUsers();
  } finally {
    loading.value = false;
  }
}

async function loadMachines() {
  try {
    const data = (await getMachines()) as ApiMachine[];
    machines.value = data.map((m) => ({
      id: String(m.id),
      name: m.name,
      location: m.location ?? undefined,
    }));
  } catch {
    machines.value = [];
  }
}

onMounted(async () => {
  await Promise.all([loadEmployees(), loadMachines()]);
});

async function refreshPage() {
  await Promise.all([loadEmployees(), loadMachines()]);
}

function openCreateModal() {
  modalMode.value = "create";
  employeeToEdit.value = null;
  showModal.value = true;
}

function openEditModal(employee: Employee) {
  modalMode.value = "edit";
  employeeToEdit.value = { ...employee };
  showModal.value = true;
}

async function handleCreateEmployee(payload: {
  documentId: string;
  name: string;
  username: string;
  password: string;
  jobRole: string;
  shift?: string;
  assignedMachineIds?: string[];
}) {
  const roleValue = payload.jobRole === "Operador" ? "operator" : "employee";
  await createUser({ ...payload, role: roleValue });
  showModal.value = false;
  await loadEmployees();
}

import { updateUser } from "../api/client";

async function handleUpdateEmployee(payload: {
  id: number;
  documentId: string;
  name: string;
  username: string;
  password?: string;
  jobRole: string;
  shift?: string;
  assignedMachineIds?: string[];
}) {
  // Determinar el valor del campo 'role' según el jobRole seleccionado
  const roleValue = payload.jobRole === "Operador" ? "operator" : "employee";
  await updateUser(payload.id, { ...payload, role: roleValue });
  showModal.value = false;
  await loadEmployees();
}

function getEmployeeMachineLabels(e: Employee): string[] {
  const ids = e.assignedMachineIds ?? [];
  if (!ids.length) return [];
  return ids
    .map((mid) => {
      const m = machines.value.find((mm) => mm.id === mid);
      return (m?.location || m?.name || mid || "").trim();
    })
    .filter((v) => !!v);
}

function getEmployeeAssignmentSummary(e: Employee): string | null {
  const labels = getEmployeeMachineLabels(e);
  if (!labels.length) return null;

  const counts = new Map<string, number>();
  for (const label of labels) {
    const current = counts.get(label) ?? 0;
    counts.set(label, current + 1);
  }

  const parts: string[] = [];
  counts.forEach((count, label) => {
    if (count > 1) {
      parts.push(`${label} (${count} máquinas)`);
    } else {
      parts.push(label);
    }
  });

  return parts.join(", ");
}

function getRoleLabel(e: Employee): string {
  if (e.jobRole) return e.jobRole;
  if (e.role === "admin") return "Admin";
  if (e.role === "operator") return "Operador";
  return "Supervisor";
}

function getEmployeeInitials(e: Employee): string {
  const base = (e.name || e.username || "").trim();
  if (!base) return "?";
  const parts = base.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

async function handleDeleteEmployee(id: number) {
  const ok = window.confirm("¿Seguro que deseas eliminar este registro?");
  if (!ok) return;
  await deleteUser(id);
  await loadEmployees();
}
</script>

<template>
  <AppSidebar
    :open="sidebarOpen"
    :dark="isDark()"
    @close="sidebarOpen = false"
  />
  <NewEmployee
    :open="showModal"
    :dark="isDark()"
    :machines="machines"
    :mode="modalMode"
    :employee="employeeToEdit"
    @close="showModal = false"
    @create="handleCreateEmployee"
    @update="handleUpdateEmployee"
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
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border text-slate-500 transition cursor-pointer group overflow-hidden shrink-0"
            :class="
              isDark()
                ? 'border-sky-400/70 hover:bg-transparent hover:text-white'
                : 'border-sky-300/80 hover:bg-transparent hover:text-sky-700'
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
          <div class="min-w-0">
            <div class="flex flex-wrap items-baseline gap-2">
              <h1 class="text-xl font-semibold sm:text-2xl">Equipo</h1>
              <span
                class="text-xs font-medium tracking-wide"
                :class="isDark() ? 'text-slate-400' : 'text-slate-500'"
              >
                Gestión de accesos y asignaciones
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full border transition cursor-pointer"
            :class="
              isDark()
                ? 'border-sky-400/40 bg-sky-900/20 text-sky-100 hover:bg-sky-900/30'
                : 'border-sky-300/80 bg-sky-50/70 text-sky-700 hover:bg-sky-50/90'
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
            type="button"
            class="inline-flex items-center gap-2 rounded-full bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:text-sm cursor-pointer whitespace-nowrap"
            @click="openCreateModal"
          >
            <span class="mr-1">+</span>
            <span>Nuevo usuario</span>
          </button>
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
      <!-- Toolbar: filtros de tipo + buscador -->
      <div
        class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
          <button
            type="button"
            class="px-3 py-1.5 rounded-full border transition font-medium"
            :class="
              peopleFilter === 'todos'
                ? isDark()
                  ? 'bg-slate-100/10 text-white border-slate-400'
                  : 'bg-slate-900 text-white border-slate-900'
                : isDark()
                ? 'bg-transparent text-slate-300 border-slate-700 hover:border-slate-500'
                : 'bg-transparent text-slate-500 border-slate-200 hover:border-slate-400'
            "
            @click="peopleFilter = 'todos'"
          >
            Todos ({{ totalPeople }})
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-full border transition font-medium"
            :class="
              peopleFilter === 'supervisores'
                ? isDark()
                  ? 'bg-slate-100/10 text-white border-violet-400'
                  : 'bg-violet-600 text-white border-violet-600'
                : isDark()
                ? 'bg-transparent text-slate-300 border-slate-700 hover:border-slate-500'
                : 'bg-transparent text-slate-500 border-slate-200 hover:border-slate-400'
            "
            @click="peopleFilter = 'supervisores'"
          >
            Supervisores ({{ totalEmployees }})
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-full border transition font-medium"
            :class="
              peopleFilter === 'operadores'
                ? isDark()
                  ? 'bg-slate-100/10 text-white border-emerald-400'
                  : 'bg-emerald-600 text-white border-emerald-600'
                : isDark()
                ? 'bg-transparent text-slate-300 border-slate-700 hover:border-slate-500'
                : 'bg-transparent text-slate-500 border-slate-200 hover:border-slate-400'
            "
            @click="peopleFilter = 'operadores'"
          >
            Operadores ({{ totalOperators }})
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
            placeholder="Buscar personal..."
            class="w-full rounded-full border px-7 py-1.5 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400"
            :class="
              isDark()
                ? 'bg-slate-900/60 text-slate-100 border-slate-700'
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
              <th class="px-4 py-2 whitespace-nowrap">Cédula</th>
              <th class="px-4 py-2 whitespace-nowrap">Nombre</th>
              <th class="px-4 py-2 whitespace-nowrap">Rol</th>
              <th class="px-4 py-2 whitespace-nowrap">Turno</th>
              <th class="px-4 py-2 whitespace-nowrap">Máquinas (ubicación)</th>
              <th class="px-4 py-2 text-right whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td class="px-4 py-3" colspan="6">Cargando...</td>
            </tr>
            <tr v-else-if="!displayedEmployees.length">
              <td class="px-4 py-10" colspan="6">
                <div
                  class="mx-auto max-w-md rounded-2xl border px-4 py-6 text-center text-sm shadow-sm backdrop-blur-xl"
                  :class="
                    isDark()
                      ? 'border-slate-700/60 bg-slate-900/20 text-slate-200'
                      : 'border-slate-200/70 bg-white/50 text-slate-600'
                  "
                >
                  <p class="text-base font-semibold">{{ emptyTitle }}</p>
                  <p class="mt-1 text-xs text-slate-400">{{ emptySubtitle }}</p>
                </div>
              </td>
            </tr>
            <tr
              v-for="e in displayedEmployees"
              :key="e.id"
              class="border-t transition-colors"
              :class="
                isDark()
                  ? 'border-slate-800/70 hover:bg-red-500/10'
                  : 'border-slate-200/70 hover:bg-red-100/50'
              "
            >
              <td class="px-4 py-2 whitespace-nowrap text-xs text-slate-500">
                {{ e.documentId || "—" }}
              </td>
              <td class="px-4 py-2 whitespace-nowrap">
                <div class="flex items-center gap-2 min-w-0">
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold"
                    :class="
                      isDark()
                        ? 'bg-slate-800 text-slate-100'
                        : 'bg-slate-100 text-slate-700'
                    "
                  >
                    {{ getEmployeeInitials(e) }}
                  </div>
                  <div class="min-w-0">
                    <div class="text-sm font-semibold truncate">
                      {{ e.name }}
                    </div>
                    <div
                      class="mt-0.5 flex flex-wrap items-center gap-2 text-[11px]"
                    >
                      <span
                        class="inline-flex items-center rounded-full px-2 py-0.5 font-medium"
                        :class="
                          e.role === 'operator'
                            ? isDark()
                              ? 'bg-emerald-900/60 text-emerald-100'
                              : 'bg-emerald-50 text-emerald-700'
                            : isDark()
                            ? 'bg-violet-900/60 text-violet-100'
                            : 'bg-violet-50 text-violet-700'
                        "
                      >
                        {{ getRoleLabel(e).toUpperCase() }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-2 whitespace-nowrap">
                <span
                  class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
                  :class="
                    isDark()
                      ? 'border-slate-700/60 bg-slate-950/20 text-slate-200'
                      : 'border-slate-200/70 bg-white/40 text-slate-700'
                  "
                >
                  {{ e.shift || "—" }}
                </span>
              </td>
              <td class="px-4 py-2 whitespace-nowrap">
                <p class="text-xs text-slate-600 flex items-center gap-1">
                  <span aria-hidden="true">📍</span>
                  <span>
                    {{ getEmployeeAssignmentSummary(e) || "Sin asignación" }}
                  </span>
                </p>
              </td>
              <td
                class="px-4 py-2 text-right text-sm space-x-2 whitespace-nowrap"
              >
                <button
                  class="inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                  type="button"
                  aria-label="Editar usuario"
                  title="Editar usuario"
                  @click="openEditModal(e)"
                >
                  <svg
                    class="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0-4-4L4 16v4Z"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
                <button
                  class="inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs text-red-500 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                  type="button"
                  aria-label="Eliminar usuario"
                  title="Eliminar usuario"
                  @click="handleDeleteEmployee(e.id)"
                >
                  <svg
                    class="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 7h14"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M10 11v6M14 11v6"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile stacked cards -->
      <div class="sm:hidden space-y-3">
        <div v-if="loading" class="px-4 py-3">Cargando...</div>
        <div v-else-if="!displayedEmployees.length" class="px-4 py-10">
          <div
            class="rounded-2xl border px-4 py-6 text-center text-sm shadow-sm backdrop-blur-xl"
            :class="
              isDark()
                ? 'border-slate-700/60 bg-slate-900/20 text-slate-200'
                : 'border-slate-200/70 bg-white/50 text-slate-600'
            "
          >
            <p class="text-base font-semibold">{{ emptyTitle }}</p>
            <p class="mt-1 text-xs text-slate-400">{{ emptySubtitle }}</p>
          </div>
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="e in displayedEmployees"
            :key="e.id"
            class="rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-xl"
            :class="
              isDark()
                ? 'border-slate-700/60 bg-slate-900/30'
                : 'border-slate-200/70 bg-white/60'
            "
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold"
                    :class="
                      isDark()
                        ? 'bg-slate-800 text-slate-100'
                        : 'bg-slate-100 text-slate-700'
                    "
                  >
                    {{ getEmployeeInitials(e) }}
                  </div>
                  <div class="min-w-0">
                    <div class="text-sm font-semibold truncate">
                      {{ e.name }}
                    </div>
                    <div class="mt-0.5 flex flex-wrap items-center gap-2">
                      <span class="text-xs text-slate-400">
                        {{ e.documentId || "—" }}
                      </span>
                      <span
                        class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                        :class="
                          e.role === 'operator'
                            ? isDark()
                              ? 'bg-emerald-900/60 text-emerald-100'
                              : 'bg-emerald-50 text-emerald-700'
                            : isDark()
                            ? 'bg-violet-900/60 text-violet-100'
                            : 'bg-violet-50 text-violet-700'
                        "
                      >
                        {{ getRoleLabel(e).toUpperCase() }}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  class="mt-2 flex items-center justify-between text-xs text-slate-600"
                >
                  <div class="flex items-center gap-1">
                    <span aria-hidden="true">📍</span>
                    <span>{{
                      getEmployeeAssignmentSummary(e) || "Sin asignación"
                    }}</span>
                  </div>
                  <div
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px]"
                    :class="
                      isDark()
                        ? 'bg-slate-800 text-slate-200'
                        : 'bg-slate-100 text-slate-700'
                    "
                  >
                    {{ e.shift || "—" }}
                  </div>
                </div>
              </div>
              <div class="flex flex-col items-end">
                <div class="mt-2 flex flex-col items-end gap-2">
                  <button
                    class="inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                    aria-label="Editar usuario"
                    title="Editar usuario"
                    @click="openEditModal(e)"
                  >
                    <svg
                      class="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0-4-4L4 16v4Z"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    class="inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs text-red-500 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                    aria-label="Eliminar usuario"
                    title="Eliminar usuario"
                    @click="handleDeleteEmployee(e.id)"
                  >
                    <svg
                      class="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 7h14"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M10 11v6M14 11v6"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
