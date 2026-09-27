<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import { ref as vueRef } from "vue";
const sidebarOpen = vueRef(false);
import { computed, onMounted, onUnmounted, ref } from "vue";
import NewEmployee from "@/components/NewEmployee.vue";
import {
  getUsers,
  getMyTeamUsers,
  createUser,
  deleteUser,
  getMachines,
  resetOperatorCoinBalance,
} from "../api/client";
import { useTheme } from "@/composables/useTheme";
import { useSearchFilter } from "@/composables/useSearchFilter";
import { isSupervisorJobRole } from "@/utils/access";
import { useRouter } from "vue-router";
import SearchBar from "@/components/SearchBar.vue";
import { getEmployeeSalesSummary, getWeeklyReports } from "../api/client";
import { getTodayLocalStr, formatTimeShort } from "@/utils/date";
import { useCurrentUser } from "@/composables/useCurrentUser";

const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;
const { roleKind, assignedMachineIds } = useCurrentUser();

const actionMenuOpenId = ref<number | null>(null);

function toggleActionMenu(employeeId: number) {
  actionMenuOpenId.value =
    actionMenuOpenId.value === employeeId ? null : employeeId;
}

function closeActionMenu() {
  actionMenuOpenId.value = null;
}

function handleGlobalClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return;
  const insideMenu = target.closest("[data-action-menu]");
  if (!insideMenu) {
    actionMenuOpenId.value = null;
  }
}

type Employee = {
  id: number;
  username: string;
  role: string;
  name: string;
  jobRole?: string;
  operatorCoinBalance?: number;
  assignedMachineIds?: string[];
};

type SimpleMachine = { id: string; name: string; location?: string };

const employees = ref<Employee[]>([]);
const machines = ref<SimpleMachine[]>([]);
const loading = ref(false);
const showModal = ref(false);
const modalMode = ref<"create" | "edit">("create");
const employeeToEdit = ref<Employee | null>(null);
const resettingEmployeeIds = ref<Set<number>>(new Set());
const resetConfirmEmployee = ref<Employee | null>(null);

function getApiErrorMessage(e: unknown): string {
  const respMsg = (e as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return respMsg || "No se pudo guardar. Intenta de nuevo.";
}

const totalPeople = computed(
  () => employees.value.filter((e) => e.role === "employee").length
);
const totalOperators = computed(
  () =>
    employees.value.filter(
      (e) => e.role === "employee" && !isSupervisorJobRole(e.jobRole)
    ).length
);
const totalEmployees = computed(
  () =>
    employees.value.filter(
      (e) => e.role === "employee" && isSupervisorJobRole(e.jobRole)
    ).length
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
  let list = employees.value.filter((e) => e.role === "employee");

  // Supervisores solo ven personal de sus maquinas asignadas
  if (roleKind.value === "supervisor") {
    const supMachineIds = new Set(assignedMachineIds.value.map(String));
    if (supMachineIds.size > 0) {
      list = list.filter((e) => {
        const empIds = (e.assignedMachineIds ?? []).map(String);
        return empIds.some((id) => supMachineIds.has(id));
      });
    } else {
      list = [];
    }
  }

  if (peopleFilter.value === "supervisores") {
    list = list.filter((e) => isSupervisorJobRole(e.jobRole));
  } else if (peopleFilter.value === "operadores") {
    list = list.filter((e) => !isSupervisorJobRole(e.jobRole));
  }

  list = filterBySearch(list, (e) =>
    `${e.name || ""} ${e.username || ""}`.trim()
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
    if (roleKind.value === "supervisor") {
      employees.value = await getMyTeamUsers();
    } else {
      employees.value = await getUsers();
    }
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
  await Promise.all([loadEmployees(), loadMachines(), loadToday()]);
  window.addEventListener("click", handleGlobalClick);
});

onUnmounted(() => {
  window.removeEventListener("click", handleGlobalClick);
});

function refreshPage() {
  window.location.reload();
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
  name: string;
  username: string;
  password: string;
  jobRole: string;
  assignedMachineIds?: string[];
}) {
  try {
    await createUser({ ...payload, role: "employee" });
    showModal.value = false;
    await loadEmployees();
  } catch (e: unknown) {
    window.alert(getApiErrorMessage(e));
  }
}

import { updateUser } from "../api/client";

async function handleUpdateEmployee(payload: {
  id: number;
  name: string;
  username: string;
  password?: string;
  jobRole: string;
  assignedMachineIds?: string[];
}) {
  try {
    await updateUser(payload.id, { ...payload, role: "employee" });
    showModal.value = false;
    await loadEmployees();
  } catch (e: unknown) {
    window.alert(getApiErrorMessage(e));
  }
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
  return isSupervisorJobRole(e.jobRole) ? "Supervisor" : "Operador";
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

function canResetOperatorCoins(e: Employee): boolean {
  return e.role === "employee" && !isSupervisorJobRole(e.jobRole);
}

function isResettingCoins(employeeId: number): boolean {
  return resettingEmployeeIds.value.has(employeeId);
}

async function handleResetOperatorCoins(e: Employee) {
  if (!canResetOperatorCoins(e)) return;

  const next = new Set(resettingEmployeeIds.value);
  next.add(e.id);
  resettingEmployeeIds.value = next;

  try {
    await resetOperatorCoinBalance(e.id);
    await loadEmployees();
  } catch (error: unknown) {
    window.alert(getApiErrorMessage(error));
  } finally {
    const done = new Set(resettingEmployeeIds.value);
    done.delete(e.id);
    resettingEmployeeIds.value = done;
  }
}

function requestResetOperatorCoins(e: Employee) {
  if (!canResetOperatorCoins(e)) return;
  resetConfirmEmployee.value = e;
}

async function confirmResetOperatorCoins() {
  const e = resetConfirmEmployee.value;
  if (!e) return;
  resetConfirmEmployee.value = null;
  await handleResetOperatorCoins(e);
}

async function handleDeleteEmployee(id: number) {
  const ok = window.confirm("¿Seguro que deseas eliminar este registro?");
  if (!ok) return;
  try {
    await deleteUser(id);
    await loadEmployees();
  } catch (e: unknown) {
    window.alert(getApiErrorMessage(e));
  }
}

const router = useRouter();

type TodayStatus = {
  registeredCoins: number;
  reportSent: boolean;
  reportSentAt: string | null;
};
const todayById = ref<Record<number, TodayStatus>>({});

async function loadToday() {
  const today = getTodayLocalStr();
  try {
    const [summary, reports] = await Promise.all([
      getEmployeeSalesSummary({ startDate: today, endDate: today }),
      getWeeklyReports({
        startDate: today,
        endDate: today,
        reportKind: "diario",
      }),
    ]);
    const map: Record<number, TodayStatus> = {};
    for (const s of Array.isArray(summary) ? summary : []) {
      const id = Number(s?.employeeId);
      if (!id) continue;
      map[id] = {
        registeredCoins: Number(s?.totalCoins) || 0,
        reportSent: false,
        reportSentAt: null,
      };
    }
    for (const r of Array.isArray(reports) ? reports : []) {
      const id = Number(r?.employeeId);
      if (!id) continue;
      const created = String(r?.createdAt || "");
      const cur = map[id] || {
        registeredCoins: 0,
        reportSent: false,
        reportSentAt: null,
      };
      cur.reportSent = true;
      if (!cur.reportSentAt || created > cur.reportSentAt) {
        cur.reportSentAt = created;
      }
      map[id] = cur;
    }
    todayById.value = map;
  } catch {
    todayById.value = {};
  }
}

const pendingReports = computed(
  () =>
    displayedEmployees.value.filter(
      (e) =>
        !isSupervisorJobRole(e.jobRole) && !todayById.value[e.id]?.reportSent
    ).length
);

function openPerson(e: Employee) {
  if (isSupervisorJobRole(e.jobRole)) {
    openEditModal(e);
    return;
  }
  router.push({
    name: "employee-report-detail",
    params: { employeeId: String(e.id) },
    query: { employeeName: e.name || e.username },
  });
}

const peopleFilters: { k: PeopleFilter; l: string }[] = [
  { k: "todos", l: "Todos" },
  { k: "operadores", l: "Operadoras" },
  { k: "supervisores", l: "Supervisores" },
];
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

  <transition name="fade">
    <div
      v-if="resetConfirmEmployee"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click="resetConfirmEmployee = null"
    >
      <div
        class="w-full max-w-sm rounded-2xl border p-5 shadow-xl"
        :class="
          isDark()
            ? 'border-zinc-700/70 bg-zinc-900 text-white'
            : 'border-slate-200 bg-white text-slate-900'
        "
        @click.stop
      >
        <h3 class="text-base font-semibold mb-2">Resetear monedas</h3>
        <p
          class="text-sm"
          :class="isDark() ? 'text-zinc-300' : 'text-slate-600'"
        >
          ¿Resetear monedas de
          <strong>{{ resetConfirmEmployee.name }}</strong> a 200 monedas
          restantes?
        </p>
        <div class="flex gap-2 mt-4">
          <button
            type="button"
            class="flex-1 h-10 rounded-xl border text-sm font-medium transition cursor-pointer"
            :class="
              isDark()
                ? 'border-zinc-700/60 bg-zinc-800/50 text-zinc-200 hover:bg-zinc-800'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            "
            @click="resetConfirmEmployee = null"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="flex-1 h-10 rounded-xl border text-sm font-medium transition cursor-pointer"
            :class="
              isDark()
                ? 'border-amber-700/60 bg-amber-900/30 text-amber-200 hover:bg-amber-900/50'
                : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
            "
            @click="confirmResetOperatorCoins()"
          >
            Resetear
          </button>
        </div>
      </div>
    </div>
  </transition>

  <div
    :class="[
      'min-h-screen px-3 py-4 sm:px-6 lg:px-8 space-y-4',
      isDark() ? 'bg-zinc-950 text-white' : 'bg-slate-100 text-slate-900',
    ]"
  >
    <header
      class="flex items-center justify-between gap-3 rounded-2xl border backdrop-blur-xl px-4 py-4 shadow-sm sm:px-6"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70'
          : 'bg-white/60 border-slate-200/70'
      "
    >
      <div class="flex items-center gap-2 min-w-0">
        <button
          type="button"
          class="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl transition cursor-pointer overflow-hidden shrink-0"
          :class="isDark() ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'"
          aria-label="Abrir menú lateral"
          @click="sidebarOpen = true"
        >
          <img
            src="/img/icons/K11BOX.webp"
            alt="K11 Box logo"
            class="h-7 w-7 sm:h-8 sm:w-8 object-cover rounded-lg"
          />
        </button>
        <div class="min-w-0">
          <h1 class="text-lg sm:text-2xl font-semibold leading-tight truncate">
            Equipo
          </h1>
          <p
            class="text-xs truncate"
            :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
          >
            {{ totalOperators }} operadoras · {{ totalEmployees }} supervisores
          </p>
        </div>
      </div>
      <button
        type="button"
        class="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500"
        @click="openCreateModal"
      >
        + Nuevo
      </button>
    </header>

    <section
      class="rounded-2xl border shadow-sm"
      :class="
        isDark()
          ? 'bg-zinc-900/70 border-zinc-800/70'
          : 'bg-white/60 border-slate-200/70'
      "
    >
      <div class="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-center">
        <SearchBar
          v-model="searchQuery"
          :is-dark="isDark()"
          placeholder="Buscar por nombre o usuario..."
          class="sm:flex-1"
        />
        <div class="flex gap-2 text-xs">
          <button
            v-for="f in peopleFilters"
            :key="f.k"
            type="button"
            class="rounded-full border px-3 py-1.5 font-medium transition"
            :class="
              peopleFilter === f.k
                ? isDark()
                  ? 'border-zinc-200 bg-zinc-100 text-zinc-900'
                  : 'border-red-500 bg-red-500 text-white'
                : isDark()
                ? 'border-zinc-700/60 text-zinc-300'
                : 'border-slate-200 text-slate-600'
            "
            @click="peopleFilter = f.k"
          >
            {{ f.l }}
          </button>
        </div>
      </div>

      <p
        v-if="pendingReports > 0"
        class="mx-4 mt-3 rounded-lg px-3 py-2 text-xs"
        :class="
          isDark()
            ? 'bg-amber-500/10 text-amber-300'
            : 'bg-amber-50 text-amber-700'
        "
      >
        {{ pendingReports }} operadora(s) aún no envían su reporte de hoy.
      </p>

      <p
        v-if="loading"
        class="px-4 py-6 text-sm"
        :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
      >
        Cargando…
      </p>
      <div v-else-if="displayedEmployees.length === 0" class="px-4 py-8">
        <p class="text-sm font-medium">{{ emptyTitle }}</p>
        <p
          class="text-xs"
          :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
        >
          {{ emptySubtitle }}
        </p>
      </div>

      <ul
        v-else
        class="mt-3 divide-y"
        :class="isDark() ? 'divide-zinc-800/70' : 'divide-slate-200/70'"
      >
        <li
          v-for="e in displayedEmployees"
          :key="e.id"
          class="relative flex items-center gap-2 pr-2"
        >
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
            @click="openPerson(e)"
          >
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
              :class="
                isDark()
                  ? 'bg-zinc-800 text-white'
                  : 'bg-slate-200 text-slate-700'
              "
            >
              {{ getEmployeeInitials(e) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold sm:text-base">
                {{ e.name || e.username }}
              </p>
              <p
                class="mt-0.5 flex items-center gap-1.5 text-xs"
                :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
              >
                <span
                  class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                  :class="
                    isSupervisorJobRole(e.jobRole)
                      ? 'bg-violet-500/15 text-violet-500'
                      : 'bg-zinc-500/15 text-zinc-400'
                  "
                  >{{ getRoleLabel(e) }}</span
                >
                <span class="truncate">{{
                  getEmployeeAssignmentSummary(e) || "Sin máquinas"
                }}</span>
              </p>
              <p
                v-if="!isSupervisorJobRole(e.jobRole)"
                class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1"
              >
                <span
                  class="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium"
                  :class="
                    todayById[e.id]?.reportSent
                      ? isDark()
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-amber-50 text-amber-700'
                      : isDark()
                      ? 'bg-orange-500/15 text-orange-300'
                      : 'bg-orange-50 text-orange-700'
                  "
                >
                  {{
                    todayById[e.id]?.reportSent
                      ? `Reporte enviado ${formatTimeShort(
                          todayById[e.id]?.reportSentAt
                        )}`
                      : "Reporte pendiente"
                  }}
                </span>
                <span
                  class="text-xs"
                  :class="isDark() ? 'text-zinc-400' : 'text-slate-500'"
                >
                  {{ todayById[e.id]?.registeredCoins || 0 }} monedas hoy
                </span>
              </p>
            </div>
            <span
              aria-hidden="true"
              :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
              >›</span
            >
          </button>

          <button
            v-if="canResetOperatorCoins(e)"
            type="button"
            class="shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium transition"
            :class="
              isDark()
                ? 'border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            "
            :disabled="isResettingCoins(e.id)"
            :title="'Recargar monedas a 200'"
            @click.stop="requestResetOperatorCoins(e)"
          >
            🪙 {{ e.operatorCoinBalance ?? 200 }}
            <span :class="isDark() ? 'text-zinc-500' : 'text-slate-400'"
              >↻</span
            >
          </button>

          <div class="relative" data-action-menu>
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none"
              :class="
                isDark()
                  ? 'text-zinc-400 hover:bg-zinc-800'
                  : 'text-slate-500 hover:bg-slate-100'
              "
              aria-label="Opciones"
              @click.stop="toggleActionMenu(e.id)"
            >
              ⋯
            </button>
            <div
              v-if="actionMenuOpenId === e.id"
              class="absolute right-0 top-9 z-20 w-52 rounded-xl border py-1 text-sm shadow-lg"
              :class="
                isDark()
                  ? 'border-zinc-800 bg-zinc-950 text-zinc-100'
                  : 'border-slate-200 bg-white text-slate-700'
              "
            >
              <button
                type="button"
                class="block w-full px-3 py-2 text-left hover:bg-slate-500/10"
                @click="
                  openEditModal(e);
                  closeActionMenu();
                "
              >
                Editar datos y máquinas
              </button>
              <button
                v-if="canResetOperatorCoins(e)"
                type="button"
                class="block w-full px-3 py-2 text-left hover:bg-slate-500/10"
                :disabled="isResettingCoins(e.id)"
                @click="
                  requestResetOperatorCoins(e);
                  closeActionMenu();
                "
              >
                Resetear monedas a 200
              </button>
              <button
                type="button"
                class="block w-full px-3 py-2 text-left text-rose-500 hover:bg-rose-500/10"
                @click="
                  handleDeleteEmployee(e.id);
                  closeActionMenu();
                "
              >
                Eliminar…
              </button>
            </div>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
