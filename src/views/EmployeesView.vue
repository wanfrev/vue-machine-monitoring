<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import { ref as vueRef } from "vue";
const sidebarOpen = vueRef(false);
import { inject, type Ref, computed, onMounted, ref } from "vue";
import NewEmployee from "@/components/NewEmployee.vue";
import { getUsers, createUser, deleteUser, getMachines } from "../api/client";

const injectedDark = inject<Ref<boolean> | boolean>("darkMode", false);

const isDark = () => {
  if (typeof injectedDark === "boolean") return injectedDark;
  return !!injectedDark?.value;
};

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

const totalSupervisors = computed(() => employees.value.length);
const totalOperators = computed(
  () => employees.value.filter((e) => e.role === "operator").length
);
const totalEmployees = computed(
  () => employees.value.filter((e) => e.role === "employee").length
);

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
    const data = await getMachines();
    machines.value = data.map((m: any) => ({
      id: m.id,
      name: m.name,
      location: m.location,
    }));
  } catch {
    machines.value = [];
  }
}

onMounted(async () => {
  await Promise.all([loadEmployees(), loadMachines()]);
});

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

function getEmployeeMachinesLabel(e: Employee): string {
  const ids = e.assignedMachineIds ?? [];
  if (!ids.length) return "—";
  const labels = ids
    .map((mid) => {
      const m = machines.value.find((mm) => mm.id === mid);
      return m?.location || m?.name || mid;
    })
    .filter(Boolean);
  return labels.length ? labels.join(", ") : "—";
}

async function handleDeleteEmployee(id: number) {
  const ok = window.confirm("¿Seguro que deseas eliminarlo?");
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
            <h1 class="text-xl font-semibold sm:text-2xl">
              Supervisores y Empleados
            </h1>
          </div>
          <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
            Gestión
          </p>
          <p
            class="text-sm"
            :class="isDark() ? 'text-slate-300' : 'text-slate-500'"
          >
            CRUD de supervisores y empleados conectado al backend.
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:text-sm cursor-pointer"
          @click="openCreateModal"
        >
          + Nuevo
        </button>
      </div>

      <div class="grid gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-3">
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
          <p class="text-2xl font-semibold">{{ totalSupervisors }}</p>
        </div>

        <div
          class="rounded-2xl border px-4 py-3 text-sm shadow-sm backdrop-blur-xl"
          :class="
            isDark()
              ? 'border-emerald-900/60 bg-emerald-950/40 text-emerald-200'
              : 'border-emerald-100/80 bg-emerald-50/60 text-emerald-700'
          "
        >
          <p
            class="mb-1 text-xs font-medium uppercase tracking-wide text-emerald-500"
          >
            Operadores
          </p>
          <p class="text-2xl font-semibold text-emerald-600">
            {{ totalOperators }}
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
            Supervisores
          </p>
          <p class="text-2xl font-semibold">{{ totalEmployees }}</p>
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
            <tr v-else-if="!employees.length">
              <td class="px-4 py-10" colspan="6">
                <div
                  class="mx-auto max-w-md rounded-2xl border px-4 py-6 text-center text-sm shadow-sm backdrop-blur-xl"
                  :class="
                    isDark()
                      ? 'border-slate-700/60 bg-slate-900/20 text-slate-200'
                      : 'border-slate-200/70 bg-white/50 text-slate-600'
                  "
                >
                  <p class="text-base font-semibold">
                    Sin supervisores ni empleados
                  </p>
                  <p class="mt-1 text-xs text-slate-400">
                    Crea el primero para que aparezca aquí.
                  </p>
                </div>
              </td>
            </tr>
            <tr
              v-for="e in employees"
              :key="e.id"
              class="border-t transition-colors"
              :class="
                isDark()
                  ? 'border-slate-800/70 hover:bg-red-500/10'
                  : 'border-slate-200/70 hover:bg-red-100/50'
              "
            >
              <td class="px-4 py-2 whitespace-nowrap">
                {{ e.documentId || "—" }}
              </td>
              <td class="px-4 py-2 whitespace-nowrap">{{ e.name }}</td>
              <td class="px-4 py-2 whitespace-nowrap">
                {{ e.jobRole || (e.role === "admin" ? "Admin" : "Empleado") }}
              </td>
              <td class="px-4 py-2 whitespace-nowrap">
                {{ e.shift || "—" }}
              </td>
              <td class="px-4 py-2 whitespace-nowrap">
                {{ getEmployeeMachinesLabel(e) }}
              </td>
              <td
                class="px-4 py-2 text-right text-sm space-x-2 whitespace-nowrap"
              >
                <button
                  class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-amber-600 transition hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                  type="button"
                  @click="openEditModal(e)"
                >
                  Editar
                </button>
                <button
                  class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
                  type="button"
                  @click="handleDeleteEmployee(e.id)"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile stacked cards -->
      <div class="sm:hidden space-y-3">
        <div v-if="loading" class="px-4 py-3">Cargando...</div>
        <div v-else-if="!employees.length" class="px-4 py-10">
          <div
            class="rounded-2xl border px-4 py-6 text-center text-sm shadow-sm backdrop-blur-xl"
            :class="
              isDark()
                ? 'border-slate-700/60 bg-slate-900/20 text-slate-200'
                : 'border-slate-200/70 bg-white/50 text-slate-600'
            "
          >
            <p class="text-base font-semibold">Sin supervisores</p>
            <p class="mt-1 text-xs text-slate-400">
              Crea el primero para que aparezca aquí.
            </p>
          </div>
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="e in employees"
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
                <div class="text-sm font-semibold">{{ e.name }}</div>
                <div class="text-xs text-slate-400 mt-1">
                  {{ e.documentId || "—" }} •
                  {{ e.jobRole || (e.role === "admin" ? "Admin" : "Empleado") }}
                </div>
                <div class="text-xs text-slate-400">
                  {{ getEmployeeMachinesLabel(e) }}
                </div>
              </div>
              <div class="flex flex-col items-end">
                <div
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                  :class="
                    isDark()
                      ? 'bg-slate-800 text-slate-200'
                      : 'bg-slate-100 text-slate-700'
                  "
                >
                  {{ e.shift || "—" }}
                </div>
                <div class="mt-2 flex flex-col items-end gap-2">
                  <button
                    class="text-amber-500 text-sm"
                    @click="openEditModal(e)"
                  >
                    Editar
                  </button>
                  <button
                    class="text-slate-400 text-sm"
                    @click="handleDeleteEmployee(e.id)"
                  >
                    Eliminar
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
