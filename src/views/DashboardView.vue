<script setup lang="ts">
import {
  inject,
  type Ref,
  ref,
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  watch,
} from "vue";
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
  getMachinePowerLogs,
} from "../api/client";
import { getSocket } from "../api/realtime";

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
  if (rawAssignedIds) {
    try {
      const parsed = JSON.parse(rawAssignedIds);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v));
      }
    } catch {
      // ignore
    }
  }
  const single = localStorage.getItem("assignedMachineId");
  return single ? [String(single)] : [];
})();
const assignedMachineIds = ref<string[]>(initialAssignedMachineIds);

const router = useRouter();

const sidebarOpen = ref(false);
const newMachineOpen = ref(false);
const filterOpen = ref(false);
const isAdmin = ref(false);
const isOperator = computed(() => currentRole.value === "operator");
const statusMenuOpenId = ref<string | null>(null);

const filterButtonEl = ref<HTMLElement | null>(null);
const filterPopoverStyle = ref<Record<string, string>>({});

const searchQuery = ref("");

function updateFilterPopoverPosition() {
  const el = filterButtonEl.value;
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const padding = 12;
  const desiredWidth = 320;
  const viewportW = window.innerWidth || 0;

  const width = Math.max(
    0,
    Math.min(desiredWidth, Math.max(0, viewportW - padding * 2))
  );
  const left = Math.min(
    Math.max(padding, rect.right - width),
    Math.max(padding, viewportW - padding - width)
  );
  const top = rect.bottom + 8;

  filterPopoverStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
  };
}

function onGlobalReposition() {
  if (!filterOpen.value) return;
  updateFilterPopoverPosition();
}

async function toggleFilters() {
  filterOpen.value = !filterOpen.value;
  if (filterOpen.value) {
    sidebarOpen.value = false;
    await nextTick();
    updateFilterPopoverPosition();
  }
}

type DashboardFilters = {
  locations: string[];
  minIncome: number;
  minUsage: number;
  maintenanceDate: string;
};

const dashboardFilters = ref<DashboardFilters>({
  locations: [],
  minIncome: 0,
  minUsage: 0,
  maintenanceDate: "",
});

type Machine = {
  id: string;
  name: string;
  status: string;
  location?: string;
  type?: string;
};
const machines = ref<Machine[]>([]);

type CoinNotification = {
  id: number;
  machineId: string;
  machineName: string;
  location?: string;
  amount: number;
  timestamp: string;
};

const notifications = ref<CoinNotification[]>([]);
const unreadCount = ref(0);
let notificationCounter = 1;
const notificationPanelOpen = ref(false);

// In-page notification sound (put a short audio file at public/sounds/coin.mp3)
const notificationSound = new Audio("/sounds/coin.mp3");
notificationSound.preload = "auto";
function playNotificationSound() {
  try {
    if (document.visibilityState === "visible") {
      notificationSound.currentTime = 0;
      void notificationSound.play();
    }
  } catch (e) {
    // ignore playback errors
  }
}

const stateFilters = [
  "todas",
  "activas",
  "inactivas",
  "mantenimiento",
] as const;
type Filter = (typeof stateFilters)[number];
const selectedFilter = ref<Filter>("todas");

const availableLocations = computed(() => {
  const set = new Set<string>();
  for (const m of machines.value) {
    const loc = (m.location ?? "").trim();
    if (loc) set.add(loc);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
});

const maxIncome = computed(() => {
  let maxVal = 0;
  for (const m of machines.value) {
    maxVal = Math.max(maxVal, getMachineIncome(m));
  }
  return maxVal;
});

// Uso (tasa) calculado con power logs (backend) - se carga bajo demanda
const activeMinutesTodayByMachine = ref<Record<string, number>>({});
const usageLoading = ref(false);
const usageLastLoadedAt = ref<number | null>(null);

function getTodayLocalStr() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function minutesSinceStartOfDay() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const diff = Math.max(
    1,
    Math.floor((now.getTime() - start.getTime()) / 60000)
  );
  return diff;
}

function getUsagePercentToday(machineId: string) {
  const activeMinutes = activeMinutesTodayByMachine.value[machineId] || 0;
  return Math.min(100, (activeMinutes / minutesSinceStartOfDay()) * 100);
}

async function ensureUsageDataFresh() {
  if (usageLoading.value) return;
  const last = usageLastLoadedAt.value;
  if (last && Date.now() - last < 60_000) return; // 1 min cache

  usageLoading.value = true;
  try {
    const todayLocalStr = getTodayLocalStr();
    const map: Record<string, number> = {};
    await Promise.all(
      machines.value.map(async (machine) => {
        try {
          const logs = await getMachinePowerLogs(machine.id, {
            startDate: todayLocalStr,
            endDate: todayLocalStr,
          });
          const activeMinutes = (logs || [])
            .filter((l) => l.event === "Encendido" && l.dur)
            .reduce((sum, l) => sum + Number(l.dur || 0), 0);
          map[machine.id] = activeMinutes;
        } catch (e) {
          map[machine.id] = 0;
        }
      })
    );
    activeMinutesTodayByMachine.value = map;
    usageLastLoadedAt.value = Date.now();
  } finally {
    usageLoading.value = false;
  }
}

// Filtrado de máquinas según rol y filtro seleccionado
const filteredMachines = computed(() => {
  let baseMachines = machines.value;
  // Si es empleado y tiene máquinas asignadas, solo mostrar esas
  if (
    (currentRole.value === "employee" || currentRole.value === "operator") &&
    assignedMachineIds.value.length
  ) {
    const idSet = new Set(assignedMachineIds.value.map((id) => String(id)));
    baseMachines = baseMachines.filter((m) => idSet.has(String(m.id)));
  }

  // 1) filtro por pestañas de estado
  if (selectedFilter.value === "activas") {
    baseMachines = baseMachines.filter((m) => m.status === "active");
  } else if (selectedFilter.value === "inactivas") {
    baseMachines = baseMachines.filter((m) => m.status === "inactive");
  } else if (selectedFilter.value === "mantenimiento") {
    baseMachines = baseMachines.filter((m) => m.status === "maintenance");
  }

  // 2) búsqueda por nombre/ubicación
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    baseMachines = baseMachines.filter((m) => {
      const hay = `${m.name ?? ""} ${m.location ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  // 3) filtros avanzados del panel
  const f = dashboardFilters.value;
  if (f.locations.length) {
    const set = new Set(f.locations);
    baseMachines = baseMachines.filter((m) =>
      set.has((m.location ?? "").trim())
    );
  }

  if (f.minIncome > 0) {
    baseMachines = baseMachines.filter(
      (m) => getMachineIncome(m) >= f.minIncome
    );
  }

  if (f.minUsage > 0) {
    baseMachines = baseMachines.filter(
      (m) => getUsagePercentToday(m.id) >= f.minUsage
    );
  }

  // No hay fecha de mantenimiento en backend; aplicamos el filtro solo como "máquinas en mantenimiento"
  // cuando el usuario selecciona una fecha.
  if (f.maintenanceDate) {
    baseMachines = baseMachines.filter((m) => m.status === "maintenance");
  }

  return baseMachines;
});

function onApplyFilters(payload: DashboardFilters) {
  dashboardFilters.value = payload;
  filterOpen.value = false;
  if (payload.minUsage > 0) {
    ensureUsageDataFresh();
  }
}

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

function shouldShowNotificationForMachine(machineId: string): boolean {
  const role = currentRole.value;
  if (role === "admin") return true;
  if (
    (role === "employee" || role === "operator") &&
    assignedMachineIds.value.length
  ) {
    return assignedMachineIds.value.includes(String(machineId));
  }
  return true;
}

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
  type?: string;
  id?: string;
}) {
  try {
    await apiCreateMachine({
      name: machine.name,
      location: machine.location,
      id: machine.id,
    });
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
  const insideStatus = target.closest("[data-status-menu]");
  if (!insideStatus) {
    statusMenuOpenId.value = null;
  }
  const insideNotif = target.closest("[data-notification-panel]");
  if (!insideNotif) {
    notificationPanelOpen.value = false;
  }
}

function clearNotifications() {
  notifications.value = [];
  try {
    localStorage.removeItem("notifications");
  } catch (e) {
    console.warn("No se pudo limpiar localStorage de notificaciones", e);
  }
}

function toggleNotificationPanel() {
  notificationPanelOpen.value = !notificationPanelOpen.value;
  if (notificationPanelOpen.value) {
    unreadCount.value = 0;
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
            // El backend ya devuelve la fecha agrupada en zona local (YYYY-MM-DD),
            // así que comparamos usando directamente la cadena sin crear Date (evita desfase de día).
            let coinsToday = 0;
            if (Array.isArray(daily) && daily.length) {
              // Buscar el registro que coincida con la fecha local
              const found = daily.find((d) => {
                if (!d.date) return false;
                const dateStr = String(d.date).slice(0, 10);
                return dateStr === todayLocalStr;
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
let coinSocket: ReturnType<typeof getSocket> | null = null;
let coinHandler: ((payload: any) => void) | null = null;
let swMessageHandler: ((ev: MessageEvent) => void) | null = null;

onMounted(async () => {
  window.addEventListener("click", handleGlobalClick, true);
  isAdmin.value = getCurrentUserRole() === "admin";
  await loadDashboardData();

  watch(filterOpen, async (open) => {
    if (open) {
      await nextTick();
      updateFilterPopoverPosition();
      window.addEventListener("resize", onGlobalReposition, { passive: true });
      // capture=true para reposicionar también si algún contenedor scrollea
      window.addEventListener("scroll", onGlobalReposition, true);
    } else {
      window.removeEventListener("resize", onGlobalReposition);
      window.removeEventListener("scroll", onGlobalReposition, true);
    }
  });

  onUnmounted(() => {
    window.removeEventListener("resize", onGlobalReposition);
    window.removeEventListener("scroll", onGlobalReposition, true);
  });

  // Suscribirse a eventos en tiempo real de monedas
  try {
    coinSocket = getSocket();
    coinHandler = (payload: any) => {
      const machineId = String(payload.machineId ?? "");
      if (!machineId || !shouldShowNotificationForMachine(machineId)) return;

      const machine = machines.value.find((m) => String(m.id) === machineId);
      const machineName =
        payload.machineName || machine?.name || `Máquina ${machineId}`;
      const location = payload.location || machine?.location;
      const amount = Number(payload.amount ?? payload.data?.cantidad ?? 1) || 1;
      const ts = payload.timestamp || new Date().toISOString();
      const timeStr = new Date(ts).toLocaleTimeString();

      const id = notificationCounter++;
      notifications.value.unshift({
        id,
        machineId,
        machineName,
        location,
        amount,
        timestamp: timeStr,
      });

      // Increment unread counter only if panel is closed
      if (!notificationPanelOpen.value) {
        unreadCount.value = (unreadCount.value || 0) + 1;
      }

      // Mantener historial en localStorage (persistente)
      try {
        localStorage.setItem(
          "notifications",
          JSON.stringify(notifications.value)
        );
      } catch (e) {
        console.warn("No se pudo guardar notificaciones en localStorage", e);
      }

      // Reproducir sonido en la página (si está visible)
      try {
        playNotificationSound();
      } catch (e) {
        /* ignore */
      }

      // Además del toast en la UI, mostrar notificación del sistema
      try {
        if ("Notification" in window) {
          if (Notification.permission === "granted") {
            const title = "Moneda ingresada";
            const bodyParts = [machineName];
            if (location) bodyParts.push(`• ${location}`);
            bodyParts.push(`+${amount} moneda(s)`);
            bodyParts.push(`• ${timeStr}`);
            const body = bodyParts.join(" ");
            new Notification(title, {
              body,
              icon: "/img/icons/K11BOX.webp",
            });
          } else if (Notification.permission === "default") {
            Notification.requestPermission();
          }
        }
      } catch (e) {
        console.warn("No se pudo mostrar la notificación del sistema:", e);
      }
    };
    coinSocket.on("coin_inserted", coinHandler);
  } catch (e) {
    console.error("No se pudo conectar al socket de tiempo real:", e);
  }

  // Intentar suscribirse a push (sólo si el navegador lo soporta)
  try {
    const pushModule = await import("@/services/push");
    pushModule.subscribeToPush().then((sub: any) => {
      if (sub) console.log("Push suscripción registrada");
    });
  } catch (e) {
    // no bloquear por errores aquí
    console.warn("No se pudo inicializar push subscription:", e);
  }

  // Escuchar mensajes del Service Worker (para reproducir sonido si hay cliente abierto)
  try {
    if (
      navigator.serviceWorker &&
      "addEventListener" in navigator.serviceWorker
    ) {
      swMessageHandler = (ev: MessageEvent) => {
        try {
          const msg = ev.data;
          if (msg && msg.type === "coin_notification") {
            // reproducir sonido en la página si corresponde
            playNotificationSound();
          }
        } catch (e) {
          // ignore
        }
      };
      navigator.serviceWorker.addEventListener("message", swMessageHandler);
    }
  } catch (e) {
    console.warn("No se pudo registrar listener de SW messages", e);
  }

  // Cargar notificaciones persistentes
  try {
    const stored = localStorage.getItem("notifications");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed))
        notifications.value = parsed as CoinNotification[];
    }
  } catch (e) {
    console.warn("Error cargando notificaciones desde localStorage", e);
  }

  // Inicializar contador de no-leídos según historial (si hay)
  try {
    unreadCount.value = notifications.value.length || 0;
  } catch (e) {
    unreadCount.value = 0;
  }

  // Recarga automática del dashboard cada 15 segundos
  refreshTimer = window.setInterval(() => {
    loadDashboardData();
  }, 15000);
});

onUnmounted(() => {
  if (refreshTimer !== undefined) {
    clearInterval(refreshTimer);
  }
  window.removeEventListener("click", handleGlobalClick, true);
  if (coinSocket && coinHandler) {
    coinSocket.off("coin_inserted", coinHandler);
  }
  if (
    swMessageHandler &&
    navigator.serviceWorker &&
    "removeEventListener" in navigator.serviceWorker
  ) {
    try {
      navigator.serviceWorker.removeEventListener("message", swMessageHandler);
    } catch (e) {
      /* ignore */
    }
  }
});

// Asegurar que al abrir el panel se resetea el contador (por si se abre desde elsewhere)
watch(notificationPanelOpen, (open) => {
  if (open) unreadCount.value = 0;
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
    v-if="!isOperator"
    :open="newMachineOpen"
    :count="machines.length"
    :machines="machines"
    :dark="isDark()"
    @close="newMachineOpen = false"
    @create="handleNewMachine"
  />

  <!-- Notificaciones: icono y panel en el header -->

  <div
    :class="[
      'min-h-full px-3 py-4 sm:px-8 sm:py-6 space-y-6',
      isDark() ? 'bg-slate-900' : 'bg-slate-50',
    ]"
  >
    <!-- Header principal -->
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
        <div class="flex items-center gap-2">
          <div class="relative overflow-visible" data-notification-panel>
            <button
              @click="toggleNotificationPanel()"
              class="relative inline-flex h-10 w-10 items-center justify-center rounded-full border text-slate-500 transition cursor-pointer group"
              :class="
                isDark()
                  ? 'border-slate-700 hover:bg-transparent hover:text-white'
                  : 'border-slate-200 hover:bg-transparent hover:text-red-700'
              "
              aria-label="Notificaciones"
            >
              <svg
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M13.73 21a2 2 0 0 1-3.46 0"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span
                v-if="unreadCount"
                class="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 inline-flex items-center justify-center bg-red-600 text-white text-xs font-bold px-2 py-0.5 min-w-[18px] min-h-[18px] border-2 border-white shadow-lg rounded-full"
                >{{ unreadCount }}</span
              >
            </button>

            <div
              v-if="notificationPanelOpen"
              class="absolute right-0 mt-2 w-80 max-h-72 overflow-auto rounded-xl border bg-white/70 backdrop-blur-xl shadow-lg z-50"
              :class="
                isDark()
                  ? 'bg-slate-900/60 border-slate-700/60 text-white'
                  : 'bg-white/70 border-slate-200/70 text-slate-900'
              "
            >
              <div class="p-3">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-sm font-semibold">Notificaciones</h3>
                  <button
                    class="text-xs text-slate-400 hover:underline"
                    @click="clearNotifications"
                  >
                    Borrar
                  </button>
                </div>
                <div class="space-y-2">
                  <div
                    v-if="!notifications.length"
                    class="text-xs text-slate-400"
                  >
                    No hay notificaciones recientes
                  </div>
                  <div
                    v-for="n in notifications"
                    :key="n.id"
                    class="flex items-start gap-2 rounded-md p-2"
                    :class="
                      isDark() ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                    "
                  >
                    <span
                      class="mt-1 h-2 w-2 rounded-full bg-emerald-500"
                    ></span>
                    <div class="flex-1 text-xs">
                      <p class="font-medium">Moneda ingresada</p>
                      <p
                        class="text-[12px] text-slate-500"
                        :class="isDark() ? 'text-slate-400' : ''"
                      >
                        {{ n.machineName }}
                        <span v-if="n.location">• {{ n.location }}</span>
                      </p>
                      <p class="text-[11px] text-slate-400">
                        +{{ n.amount }} • {{ n.timestamp }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tarjetas métricas superiores -->
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
            Total de máquinas
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
            Máquinas activas
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
            Máquinas inactivas
          </p>
          <p class="text-2xl font-semibold text-red-600">
            {{ inactiveMachines }}
          </p>
        </div>

        <div
          v-if="!isOperator"
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
        class="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border bg-white/60 backdrop-blur-xl px-4 py-3 shadow-sm sm:flex sm:flex-row sm:items-center sm:justify-between sm:px-6"
        :class="
          isDark()
            ? 'bg-slate-900/40 border-slate-700/60'
            : 'bg-white/60 border-slate-200/70'
        "
      >
        <div
          class="flex min-w-0 items-center gap-3 rounded-full border px-3 py-2 text-sm sm:flex-1"
          :class="
            isDark()
              ? 'border-slate-700/60 bg-slate-900/30 text-slate-200'
              : 'border-slate-200/70 bg-white/50 text-slate-600'
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
            v-model="searchQuery"
            class="min-w-0 w-full bg-transparent text-xs outline-none placeholder:text-slate-400 sm:text-sm"
          />
        </div>

        <div class="flex items-center gap-2 justify-self-end">
          <button
            ref="filterButtonEl"
            class="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 sm:text-sm cursor-pointer"
            :class="
              isDark()
                ? 'border-slate-700/60 bg-slate-900/40 backdrop-blur-xl text-slate-100 hover:bg-slate-900/60'
                : 'border-slate-200/70 bg-white/50 backdrop-blur-xl text-slate-700 hover:bg-white/70'
            "
            @click="toggleFilters"
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
            <span>Filtro</span>
          </button>
        </div>
        <button
          v-if="!isOperator"
          class="col-span-2 inline-flex w-full items-center gap-1 rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-red-700 sm:col-auto sm:w-auto sm:text-sm cursor-pointer"
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
          <span>Nueva máquina</span>
        </button>
      </div>

      <Teleport to="body">
        <div
          v-if="filterOpen"
          class="fixed inset-0 z-[9998]"
          aria-hidden="true"
          @click="filterOpen = false"
        ></div>
        <div
          v-if="filterOpen"
          class="fixed z-[9999]"
          :style="filterPopoverStyle"
          @click.stop
        >
          <FilterPanel
            :open="true"
            placement="static"
            :locations="availableLocations"
            :maxIncome="maxIncome"
            :showIncomeFilter="!isOperator"
            @close="filterOpen = false"
            @apply="
              (p) => {
                onApplyFilters(p);
                filterOpen = false;
              }
            "
          />
        </div>
      </Teleport>
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
            : 'bg-white/50 backdrop-blur text-slate-600 border border-slate-200/70 hover:bg-white/70',
        ]"
      >
        {{ filter.charAt(0).toUpperCase() + filter.slice(1) }}
      </button>
    </div>
    <section
      class="grid grid-cols-2 gap-3 pb-6 auto-rows-fr sm:gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3"
    >
      <article
        v-for="machine in filteredMachines"
        :key="machine.name"
        class="relative flex flex-col justify-between rounded-2xl border bg-white/60 backdrop-blur-xl p-4 text-sm shadow-sm"
        :class="
          isDark()
            ? 'bg-slate-900/40 border-slate-700/60 text-slate-100'
            : 'bg-white/60 border-slate-200/70 text-slate-700'
        "
      >
        <header class="mb-3 flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h2 class="text-sm font-semibold">{{ machine.name }}</h2>
            <div class="mt-1">
              <span
                v-if="machine.location"
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
                  machine.location
                }}</span>
              </span>
              <span v-else class="text-xs text-slate-400">—</span>
            </div>
          </div>
          <button
            class="inline-flex h-8 w-8 shrink-0 flex-none items-center justify-center rounded-full border text-xs font-semibold text-red-600 shadow-sm cursor-pointer"
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
          class="absolute top-12 z-20 rounded-xl border text-xs shadow-lg left-4 right-4 sm:left-auto sm:right-4 w-auto sm:w-48 max-w-[90vw]"
          :class="
            isDark()
              ? 'border-slate-700/60 bg-slate-900/70 backdrop-blur-xl text-slate-100'
              : 'border-slate-200/70 bg-white/70 backdrop-blur-xl text-slate-700'
          "
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
            <div class="flex items-center gap-2">
              <span
                v-if="machine.status === 'maintenance'"
                class="h-1.5 w-1.5 rounded-full bg-emerald-500"
              ></span>
              <span class="text-[11px]">
                {{
                  machine.status === "maintenance"
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
          <p v-if="!isOperator" class="font-medium text-slate-400">
            Ingresos hoy
          </p>
          <p
            v-if="!isOperator"
            class="text-right font-semibold text-slate-800"
            :class="isDark() ? 'text-slate-100' : ''"
          >
            $ {{ getMachineIncomeToday(machine) }}
          </p>
          <p v-if="!isOperator" class="font-medium text-slate-400">
            Total ingresos
          </p>
          <p
            v-if="!isOperator"
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
