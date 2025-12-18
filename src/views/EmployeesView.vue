<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import { ref as vueRef } from "vue";
const sidebarOpen = vueRef(false);
import { inject, type Ref, onMounted, ref } from "vue";
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
  await createUser(payload);
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
  let roleValue = "employee";
  if (payload.jobRole === "Operador") {
    roleValue = "operator";
  }
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
  const ok = window.confirm("¿Seguro que deseas eliminar este supervisor?");
  if (!ok) return;
  await deleteUser(id);
  await loadEmployees();
}
</script>

<template>
  <div class="flex">
    <AppSidebar
      :open="sidebarOpen"
      :dark="isDark()"
      @close="sidebarOpen = false"
    />
    <div class="flex-1">
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
      <!-- Botón de menú para abrir la sidebar (icono rayo) -->
      <div
        :class="[
          'px-2 py-4 sm:p-6',
          isDark() ? 'text-white bg-slate-900' : 'text-slate-900 bg-white',
        ]"
      >
        <div
          class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4"
        >
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg border text-slate-500 transition cursor-pointer"
              :class="
                isDark()
                  ? 'border-red-300 bg-red-700 hover:bg-red-600 hover:text-white'
                  : 'border-red-200 bg-red-100 hover:bg-red-200 hover:text-red-700'
              "
              aria-label="Abrir menú lateral"
              @click="sidebarOpen = true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 512 512"
                fill="none"
              >
                <path
                  d="M315.27,33,96,304H224L192.49,477.23a2.36,2.36,0,0,0,2.33,2.77h0a2.36,2.36,0,0,0,1.89-.95L416,208H288L319.66,34.75A2.45,2.45,0,0,0,317.22,32h0A2.42,2.42,0,0,0,315.27,33Z"
                  :stroke="isDark() ? '#ffffff' : '#000000'"
                  stroke-width="28"
                />
              </svg>
            </button>
            <h1
              class="text-3xl font-bold"
              :class="isDark() ? 'text-white' : 'text-slate-900'"
            >
              Supervisor
            </h1>
          </div>
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium text-white shadow-sm"
            @click="openCreateModal"
          >
            + Nuevo supervisor
          </button>
        </div>
        <p
          class="text-sm mb-4"
          :class="isDark() ? 'text-slate-300' : 'text-slate-600'"
        >
          CRUD de supervisores conectado al backend.
        </p>
        <div
          class="overflow-x-auto rounded-xl border shadow-sm"
          :class="
            isDark()
              ? 'border-slate-800 bg-slate-900'
              : 'border-slate-200 bg-white'
          "
        >
          <table
            class="min-w-full text-left text-sm"
            :class="isDark() ? 'text-slate-100' : 'text-slate-900'"
          >
            <thead
              :class="
                isDark()
                  ? 'bg-slate-800 text-slate-300'
                  : 'bg-slate-50 text-slate-600'
              "
            >
              <tr>
                <th class="px-4 py-2 whitespace-nowrap">Cédula</th>
                <th class="px-4 py-2 whitespace-nowrap">Nombre</th>
                <th class="px-4 py-2 whitespace-nowrap">Rol</th>
                <th class="px-4 py-2 whitespace-nowrap">Turno</th>
                <th class="px-4 py-2 whitespace-nowrap">
                  Máquinas (ubicación)
                </th>
                <th class="px-4 py-2 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td class="px-4 py-3" colspan="6">Cargando...</td>
              </tr>
              <tr
                v-for="e in employees"
                :key="e.id"
                class="border-t"
                :class="
                  isDark()
                    ? 'border-slate-800 hover:bg-slate-800'
                    : 'border-slate-200 hover:bg-slate-50'
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
                  <button class="text-red-500 hover:underline" type="button">
                    Ver
                  </button>
                  <button
                    class="text-amber-500 hover:underline"
                    type="button"
                    @click="openEditModal(e)"
                  >
                    Editar
                  </button>
                  <button
                    class="text-slate-400 hover:underline"
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
      </div>
    </div>
  </div>
</template>
