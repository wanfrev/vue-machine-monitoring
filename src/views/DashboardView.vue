<script setup lang="ts">
// Datos del usuario autenticado desde localStorage
const currentRole = ref(localStorage.getItem("role") || "");
const currentUserName = ref(localStorage.getItem("userName") || "usuario");
// Máquinas asignadas al empleado (si aplica)
let rawAssignedIds: string | null = null;
try {
  rawAssignedIds = localStorage.getItem("assignedMachineIds");
} catch (e) {
  rawAssignedIds = null;
}
const initialAssignedMachineIds: string[] = (() => {
  // Preferimos un arreglo JSON en assignedMachineIds
  if (rawAssignedIds) {
    try {
      const parsed = JSON.parse(rawAssignedIds);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v));
      }
    } catch {
      // ignorar error de parseo
    }
  }
  // Compatibilidad: si solo hay un ID antiguo en assignedMachineId
  const single = localStorage.getItem("assignedMachineId");
  return single ? [String(single)] : [];
})();
const assignedMachineIds = ref<string[]>(initialAssignedMachineIds);
import { inject, type Ref, ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import AppSidebar from "@/components/AppSidebar.vue";
import NewMachine from "@/components/NewMachine.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import {
  getMachines,
  createMachine as apiCreateMachine,
  getCoinsByMachine,
  updateMachine,
  getMachineDailyIncome,
} from "../api/client";

const router = useRouter();

const sidebarOpen = ref(false);
const newMachineOpen = ref(false);
const filterOpen = ref(false);
const isAdmin = ref(false);
const statusMenuOpenId = ref<string | null>(null);

type Machine = {
  id: string;
  name: string;
  status: string;
  location?: string;
  type?: string;
};
const machines = ref<Machine[]>([]);

const stateFilters = [
  "todas",
  "activas",
  "inactivas",
  "mantenimiento",
] as const;
type Filter = (typeof stateFilters)[number];
const selectedFilter = ref<Filter>("todas");

// Filtrado de máquinas según rol y filtro seleccionado
const filteredMachines = computed(() => {
  let baseMachines = machines.value;
  // Si es empleado y tiene máquinas asignadas, solo mostrar esas
  if (currentRole.value === "employee" && assignedMachineIds.value.length) {
    const idSet = new Set(assignedMachineIds.value.map((id) => String(id)));
    baseMachines = baseMachines.filter((m) => idSet.has(String(m.id)));
  }
  if (selectedFilter.value === "todas") return baseMachines;
  if (selectedFilter.value === "activas")
    return baseMachines.filter((m) => m.status === "active");
  if (selectedFilter.value === "inactivas")
    return baseMachines.filter((m) => m.status === "inactive");
  if (selectedFilter.value === "mantenimiento")
    return baseMachines.filter((m) => m.status === "maintenance");
  return baseMachines;
});

// monedas por máquina (histórico total): { [machineId]: total_coins }
const coinsByMachine = ref<Record<string, number>>({});
// monedas de HOY por máquina: { [machineId]: coins_today }
const dailyCoinsByMachine = ref<Record<string, number>>({});

const totalMachines = computed(() => machines.value.length);
const activeMachines = computed(
  () => machines.value.filter((m) => m.status === "active").length
);
const inactiveMachines = computed(
  () => totalMachines.value - activeMachines.value
);
// Ingreso total en dinero HOY (se calcula a partir de las monedas de hoy por máquina)
const totalIncomeToday = computed(() =>
  machines.value.reduce(
    (sum, machine) => sum + getMachineIncomeToday(machine),
    0
  )
);

const injectedDark = inject<Ref<boolean> | boolean>("darkMode", false);
const isDark = () => {
  if (typeof injectedDark === "boolean") return injectedDark;
  return !!injectedDark?.value;
};

function getMachineCoins(machineId: string): number {
  return coinsByMachine.value[machineId] || 0;
}

function getMachineCoinsToday(machineId: string): number {
  return dailyCoinsByMachine.value[machineId] || 0;
}

function getMachineIncome(machine: Machine): number {
  const coins = getMachineCoins(machine.id);
  const valuePerCoin = machine.name.includes("Boxeo") ? 1 : 2;
  return coins * valuePerCoin;
}

function getMachineIncomeToday(machine: Machine): number {
  const coins = getMachineCoinsToday(machine.id);
  const valuePerCoin = machine.name.includes("Boxeo") ? 1 : 2;
  return coins * valuePerCoin;
}

function getCurrentUserRole(): string | null {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    return (
      payload.role ||
      payload.jobRole ||
      payload.userRole ||
      payload["role"] ||
      null
    );
  } catch (e) {
    console.error("No se pudo decodificar el token JWT:", e);
    return null;
  }
}

async function handleNewMachine(machine: {
  name: string;
  location: string;
  type: string;
  id?: string;
}) {
  try {
    await apiCreateMachine(machine);
    machines.value = await getMachines();
  } catch (err: unknown) {
    console.error("Error al crear máquina:", err);
  }
}

function toggleStatusMenu(machineId: string) {
  if (!isAdmin.value) {
    alert("Solo un administrador puede cambiar el estado de la máquina.");
    return;
  }
  statusMenuOpenId.value =
    statusMenuOpenId.value === machineId ? null : machineId;
}

async function toggleMaintenance(machine: Machine) {
  if (!isAdmin.value) return;
  const newStatus =
    machine.status === "maintenance" ? "inactive" : "maintenance";
  try {
    await updateMachine(machine.id, { status: newStatus });
    machines.value = machines.value.map((m) =>
      m.id === machine.id ? { ...m, status: newStatus } : m
    );
  } catch (err) {
    console.error("Error actualizando estado de máquina:", err);
  } finally {
    statusMenuOpenId.value = null;
  }
}

function handleGlobalClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return;
  const inside = target.closest("[data-status-menu]");
  if (!inside) {
    statusMenuOpenId.value = null;
  }
}

async function loadDashboardData() {
  try {
    machines.value = await getMachines();
    // cargar monedas agrupadas por máquina (total histórico)
    try {
      const coinsPerMachine = await getCoinsByMachine();
      const map: Record<string, number> = {};
      for (const row of coinsPerMachine) {
        map[row.machine_id] = Number(row.total_coins ?? 0);
      }
      coinsByMachine.value = map;
    } catch (e) {
      console.error("Error obteniendo monedas por máquina:", e);
      coinsByMachine.value = {};
    }

    // cargar monedas de HOY por máquina para los contadores diarios (usando fecha local)
    try {
      const today = new Date();
      // Obtener YYYY-MM-DD local
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const todayLocalStr = `${year}-${month}-${day}`;
      const dailyMap: Record<string, number> = {};

      await Promise.all(
        machines.value.map(async (machine) => {
          try {
            const daily = await getMachineDailyIncome(machine.id, {
              startDate: todayLocalStr,
              endDate: todayLocalStr,
            });
            // getMachineDailyIncome devuelve [{ date, income }] donde date puede estar en UTC, así que normalizamos a local
            let coinsToday = 0;
            if (Array.isArray(daily) && daily.length) {
              // Buscar el registro que coincida con la fecha local
              const found = daily.find((d) => {
                if (!d.date) return false;
                const dDate = new Date(d.date);
                const dYear = dDate.getFullYear();
                const dMonth = String(dDate.getMonth() + 1).padStart(2, "0");
                const dDay = String(dDate.getDate()).padStart(2, "0");
                return `${dYear}-${dMonth}-${dDay}` === todayLocalStr;
              });
              coinsToday = found ? Number(found.income ?? 0) : 0;
            }
            dailyMap[machine.id] = coinsToday;
          } catch (err) {
            console.error(
              "Error obteniendo monedas de hoy para máquina:",
              machine.id,
              err
            );
            dailyMap[machine.id] = 0;
          }
        })
      );

      dailyCoinsByMachine.value = dailyMap;
    } catch (e) {
      console.error("Error obteniendo monedas diarias por máquina:", e);
      dailyCoinsByMachine.value = {};
    }
  } catch (err: unknown) {
    const anyErr = err as { response?: { status?: number } };
    if (anyErr.response?.status === 401 || anyErr.response?.status === 403) {
      router.push({ name: "login" });
    } else {
      console.error("Error al cargar máquinas:", err);
    }
  }
}

let refreshTimer: number | undefined;

onMounted(async () => {
  window.addEventListener("click", handleGlobalClick, true);
  isAdmin.value = getCurrentUserRole() === "admin";
  await loadDashboardData();

  // Recarga automática del dashboard cada 15 segundos
  refreshTimer = window.setInterval(() => {
    loadDashboardData();
  }, 1000);
});

onUnmounted(() => {
  if (refreshTimer !== undefined) {
    clearInterval(refreshTimer);
  }
  window.removeEventListener("click", handleGlobalClick, true);
});
</script>

<template>
  <AppSidebar
    :open="sidebarOpen"
    :dark="isDark()"
    @close="sidebarOpen = false"
    @open="filterOpen = false"
  />
  <NewMachine
    :open="newMachineOpen"
    :count="machines.length"
    :machines="machines"
    :dark="isDark()"
    @close="newMachineOpen = false"
    @create="handleNewMachine"
  />

  <div
    :class="[
      'min-h-full px-3 py-4 sm:px-8 sm:py-6 space-y-6',
      isDark() ? 'bg-slate-900' : 'bg-slate-50',
    ]"
  >
    <!-- Header principal -->
    <header
      class="flex flex-col gap-4 rounded-2xl border bg-white px-4 py-4 shadow-sm sm:px-8 sm:py-5"
      :class="
        isDark()
          ? 'bg-slate-900/60 border-slate-800 text-white'
          : 'bg-white border-slate-200 text-slate-900'
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
              @click="
                sidebarOpen = true;
                filterOpen = false;
              "
            >
              <img
                src="/img/icons/K11BOX.webp"
                alt="MachineHub logo"
                class="h-full w-full object-cover rounded-full transition-transform duration-200 group-hover:scale-105 group-hover:shadow-lg"
              />
            </button>
            <h1 class="text-xl font-semibold sm:text-2xl">MachineHub</h1>
          </div>
          <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
            Panel de control
          </p>
          <p
            class="text-sm"
            :class="isDark() ? 'text-slate-300' : 'text-slate-500'"
          >
            Bienvenido,
            <span class="font-medium">{{ currentUserName }}</span
            >.
          </p>
        </div>
        <!-- Botón salir movido a Sidebar -->
      </div>

      <!-- Tarjetas métricas superiores -->
      <div class="grid gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-4">
        <div
          class="rounded-2xl border px-4 py-3 text-sm shadow-sm"
          :class="
            isDark()
              ? 'border-slate-800 bg-slate-900/60 text-slate-100'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          "
        >
          <p
            class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
          >
            Total de máquinas
          </p>
          <p class="text-2xl font-semibold">{{ totalMachines }}</p>
        </div>

        <div
          class="rounded-2xl border px-4 py-3 text-sm shadow-sm"
          :class="
            isDark()
              ? 'border-green-900/60 bg-green-950/40 text-green-200'
              : 'border-green-100 bg-green-50 text-green-700'
          "
        >
          <p
            class="mb-1 text-xs font-medium uppercase tracking-wide text-emerald-500"
          >
            Máquinas activas
          </p>
          <p class="text-2xl font-semibold text-emerald-600">
            {{ activeMachines }}
          </p>
        </div>

        <div
          class="rounded-2xl border px-4 py-3 text-sm shadow-sm"
          :class="
            isDark()
              ? 'border-red-900/60 bg-red-950/40 text-red-200'
              : 'border-red-100 bg-red-50 text-red-700'
          "
        >
          <p
            class="mb-1 text-xs font-medium uppercase tracking-wide text-red-400"
          >
            Máquinas inactivas
          </p>
          <p class="text-2xl font-semibold text-red-600">
            {{ inactiveMachines }}
          </p>
        </div>

        <div
          class="rounded-2xl border px-4 py-3 text-sm shadow-sm"
          :class="
            isDark()
              ? 'border-slate-800 bg-slate-950/40 text-slate-200'
              : 'border-slate-200 bg-white text-slate-700'
          "
        >
          <p
            class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400"
          >
            Dinero recolectado hoy
          </p>
          <p class="text-2xl font-semibold text-slate-900">
            $ {{ totalIncomeToday }}
          </p>
        </div>
      </div>
    </header>

    <!-- Barra de búsqueda y acciones -->
    <section class="space-y-4">
      <div
        class="flex flex-col gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6"
        :class="
          isDark()
            ? 'bg-slate-900/60 border-slate-800'
            : 'bg-white border-slate-200'
        "
      >
        <div
          class="flex flex-1 items-center gap-3 rounded-full border px-3 py-2 text-sm"
          :class="
            isDark()
              ? 'border-slate-700 bg-slate-900/80 text-slate-200'
              : 'border-slate-200 bg-slate-50 text-slate-500'
          "
        >
          <svg
            class="text-slate-400"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M21 21l-4.35-4.35"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle
              cx="11"
              cy="11"
              r="6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <input
            type="text"
            placeholder="Buscar máquina u ubicación..."
            class="w-full bg-transparent text-xs outline-none placeholder:text-slate-400 sm:text-sm"
          />
        </div>

        <div class="flex items-center gap-2 self-end sm:self-auto">
          <div class="relative">
            <button
              class="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 sm:text-sm cursor-pointer"
              :class="
                isDark()
                  ? 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800'
                  : 'border-slate-200 bg-white text-slate-700'
              "
              @click="
                filterOpen = !filterOpen;
                if (filterOpen) sidebarOpen = false;
              "
            >
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M3 4.6C3 4.03995 3 3.75992 3.10899 3.54601C3.20487 3.35785 3.35785 3.20487 3.54601 3.10899C3.75992 3 4.03995 3 4.6 3H19.4C19.9601 3 20.2401 3 20.454 3.10899C20.6422 3.20487 20.7951 3.35785 20.891 3.54601C21 3.75992 21 4.03995 21 4.6V6.33726C21 6.58185 21 6.70414 20.9724 6.81923C20.9479 6.92127 20.9075 7.01881 20.8526 7.10828C20.7908 7.2092 20.7043 7.29568 20.5314 7.46863L14.4686 13.5314C14.2957 13.7043 14.2092 13.7908 14.1474 13.8917C14.0925 13.9812 14.0521 14.0787 14.0276 14.1808C14 14.2959 14 14.4182 14 14.6627V17L10 21V14.6627C10 14.4182 10 14.2959 9.97237 14.1808C9.94787 14.0787 9.90747 13.9812 9.85264 13.8917C9.7908 13.7908 9.70432 13.7043 9.53137 13.5314L3.46863 7.46863C3.29568 7.29568 3.2092 7.2092 3.14736 7.10828C3.09253 7.01881 3.05213 6.92127 3.02763 6.81923C3 6.70414 3 6.58185 3 6.33726V4.6Z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span class="hidden sm:inline">Filtro</span>
            </button>
            <FilterPanel
              :open="filterOpen"
              @close="filterOpen = false"
              @apply="filterOpen = false"
            />
          </div>
          <button
            class="inline-flex items-center gap-1 rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-red-700 sm:text-sm cursor-pointer"
            @click="newMachineOpen = true"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 5v14"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M5 12h14"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span class="hidden sm:inline">Nueva</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Grid de tarjetas de máquinas -->
    <div class="flex gap-2 mb-4">
      <button
        v-for="filter in stateFilters"
        :key="filter"
        @click="selectedFilter = filter"
        :class="[
          'px-3 py-1 rounded-full font-medium text-xs sm:text-sm cursor-pointer transition',
          selectedFilter === filter
            ? 'bg-slate-900 text-white hover:bg-slate-800'
            : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50',
        ]"
      >
        {{ filter.charAt(0).toUpperCase() + filter.slice(1) }}
      </button>
    </div>
    <section
      class="grid gap-4 pb-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3"
    >
      <article
        v-for="machine in filteredMachines"
        :key="machine.name"
        class="relative flex flex-col justify-between rounded-2xl border bg-white p-4 text-sm shadow-sm"
        :class="
          isDark()
            ? 'bg-slate-900/70 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-700'
        "
      >
        <header class="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 class="text-sm font-semibold">{{ machine.name }}</h2>
            <p class="text-xs text-slate-400">{{ machine.location }}</p>
          </div>
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold text-red-600 shadow-sm cursor-pointer"
            :class="
              isDark()
                ? 'border-red-500/40 bg-red-900/40 text-red-100'
                : 'border-red-100 bg-red-50'
            "
            type="button"
            @click.stop="toggleStatusMenu(machine.id)"
          >
            <svg
              width="16"
              height="16"
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
        </header>

        <!-- Menú de cambio de estado (solo admin) -->
        <div
          v-if="statusMenuOpenId === machine.id && isAdmin"
          class="absolute right-4 top-12 z-20 w-48 rounded-xl border border-slate-200 bg-white text-xs shadow-lg"
          data-status-menu
        >
          <p class="px-3 pt-2 pb-1 text-[11px] font-medium text-slate-400">
            Modo mantenimiento
          </p>
          <button
            type="button"
            class="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-slate-50 text-slate-600"
            @click="toggleMaintenance(machine)"
          >
            <span>
              {{
                machine.status === "maintenance"
                  ? "Desactivar mantenimiento"
                  : "Activar mantenimiento"
              }}
            </span>
            <span
              v-if="machine.status === 'maintenance'"
              class="h-1.5 w-1.5 rounded-full bg-emerald-500"
            ></span>
          </button>
          <button
            type="button"
            class="w-full px-3 py-1.5 text-left text-[11px] text-slate-400 hover:bg-slate-50"
            @click="statusMenuOpenId = null"
          >
            Cancelar
          </button>
        </div>

        <div class="mb-3">
          <span
            class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            :class="
              machine.status === 'active'
                ? isDark()
                  ? 'bg-emerald-900/60 text-emerald-100'
                  : 'bg-emerald-50 text-emerald-700'
                : machine.status === 'maintenance'
                ? isDark()
                  ? 'bg-amber-900/60 text-amber-100'
                  : 'bg-amber-50 text-amber-700'
                : isDark()
                ? 'bg-red-900/60 text-red-100'
                : 'bg-red-50 text-red-700'
            "
          >
            {{
              machine.status === "active"
                ? "Activa"
                : machine.status === "maintenance"
                ? "Mantenimiento"
                : "Inactiva"
            }}
          </span>
        </div>

        <div
          class="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl border px-3 py-2 text-xs"
          :class="
            isDark()
              ? 'border-slate-800 bg-slate-900/40'
              : 'border-slate-200 bg-slate-50'
          "
        >
          <p class="font-medium text-slate-400">Ingresos hoy</p>
          <p
            class="text-right font-semibold text-slate-800"
            :class="isDark() ? 'text-slate-100' : ''"
          >
            $ {{ getMachineIncomeToday(machine) }}
          </p>
          <p class="font-medium text-slate-400">Total ingresos</p>
          <p
            class="text-right text-slate-800"
            :class="isDark() ? 'text-slate-100' : ''"
          >
            $ {{ getMachineIncome(machine) }}
          </p>
          <p class="font-medium text-slate-400">Monedas hoy</p>
          <p
            class="text-right text-slate-800"
            :class="isDark() ? 'text-slate-100' : ''"
          >
            {{ getMachineCoinsToday(machine.id) }}
          </p>
          <p class="font-medium text-slate-400">Tiempo activo</p>
          <p
            class="text-right text-slate-800"
            :class="isDark() ? 'text-slate-100' : ''"
          >
            0 h
          </p>
        </div>

        <div class="mb-3 space-y-1 text-[11px] text-slate-400">
          <p>Último inicio: --</p>
          <p>Último cierre: --</p>
        </div>

        <div class="mt-1 flex justify-end">
          <RouterLink
            :to="{
              name: 'machine-resumen',
              params: { id: machine.name },
              query: { location: machine.location, status: 'Activa' },
            }"
            class="inline-flex w-full items-center justify-between rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white shadow-sm sm:w-auto sm:px-5 cursor-pointer"
            :class="isDark() ? 'hover:bg-red-500' : 'hover:bg-red-700'"
          >
            <span>Ver detalles</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M5 12h14"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M12 5l7 7-7 7"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </RouterLink>
        </div>
      </article>
    </section>
  </div>
</template>
