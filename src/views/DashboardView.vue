<script setup lang="ts">
import {
  inject,
  type Ref,
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
} from "vue";
import { useRouter } from "vue-router";
import AppSidebar from "@/components/AppSidebar.vue";
import NewMachine from "@/components/NewMachine.vue";
import FilterPanel from "@/components/FilterPanel.vue";

import {
  getMachines,
  createMachine as apiCreateMachine,
  updateMachine,
  getMachineDailyIncome,
  getMachinePowerLogs,
  getIotEvents,
} from "../api/client";
import { getSocket } from "../api/realtime";
import { canAccessMachine, filterMachinesForRole } from "@/utils/access";

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
    } catch (e) {
      void e;
    }
  }
  const single = localStorage.getItem("assignedMachineId");
  return single ? [String(single)] : [];
})();
const assignedMachineIds = ref<string[]>(initialAssignedMachineIds);

const router = useRouter();

const sidebarOpen = ref(false);
const newMachineOpen = ref(false);
const newMachineMode = ref<"create" | "edit">("create");
const machineToEdit = ref<Machine | null>(null);
const filterOpen = ref(false);
const isAdmin = ref(false);
const isOperator = computed(() => currentRole.value === "operator");
const statusMenuOpenId = ref<string | null>(null);

async function refreshPage() {
  // Forzar recarga equivalente a Ctrl/Shift+Refresh: intentar invalidar SW y evitar caché
  try {
    // Unregister all service workers so they won't serve cached assets
    if (navigator && "serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch (e) {
    // ignore errors unregistering
  }

  // Navegar a la misma URL con cache-buster para forzar recarga completa de recursos
  try {
    const href = window.location.href.split("#")[0];
    const sep = href.includes("?") ? "&" : "?";
    window.location.replace(href + sep + "_cb=" + Date.now());
  } catch (e) {
    // Fallback simple
    window.location.reload();
  }
}

function closeNewMachine() {
  newMachineOpen.value = false;
  machineToEdit.value = null;
  newMachineMode.value = "create";
}

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
};

const dashboardFilters = ref<DashboardFilters>({
  locations: [],
});

type Machine = {
  id: string;
  name: string;
  status: string;
  location?: string;
  test_mode?: boolean;
  type?: string;
  last_on?: string | null;
  last_off?: string | null;
};
const machines = ref<Machine[]>([]);

const scopedMachines = computed(() =>
  filterMachinesForRole(machines.value, {
    role: currentRole.value,
    assignedMachineIds: assignedMachineIds.value,
  })
);

function canSeeMachineId(machineId: string): boolean {
  const m = machines.value.find((x) => String(x.id) === String(machineId));
  return canAccessMachine({
    role: currentRole.value,
    assignedMachineIds: assignedMachineIds.value,
    machineId: String(machineId),
    // Be conservative when machine isn't resolved: treat as inactive.
    machineStatus: m?.status ?? "inactive",
  });
}

type DashboardNotificationType =
  | "coin_inserted"
  | "machine_on"
  | "machine_off"
  | "event";

type DashboardNotification = {
  id: number;
  type: DashboardNotificationType;
  machineId: string;
  machineName: string;
  location?: string;
  timestamp: string;
  amount?: number;
  detail?: string;
};

const notifications = ref<DashboardNotification[]>([]);
const unreadCount = ref(0);
let notificationCounter = 1;

// Toast para notificaciones entrantes (UI flotante)
type Toast = {
  id: number;
  title: string;
  body?: string;
  type?: DashboardNotificationType;
} | null;
const toast = ref<Toast>(null);
let toastTimer: number | null = null;
function showToast(
  title: string,
  body?: string,
  type?: DashboardNotificationType,
  duration = 4000
) {
  try {
    toast.value = { id: Date.now(), title, body, type };
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    toastTimer = window.setTimeout(() => {
      toast.value = null;
      toastTimer = null;
    }, duration);
  } catch (e) {
    toast.value = null;
  }
}
function hideToast() {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  toast.value = null;
}

// Deprecated: notificationRange replaced by isTodayOnly + date range
// kept here for compatibility comments only

function normalizeTimestamp(ts: unknown): string {
  const raw = String(ts ?? "").trim();
  if (!raw) return new Date().toISOString();

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();

  // Legacy: only time like "HH:mm" or "HH:mm:ss" -> assume today
  const m = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const now = new Date();
    const h = Math.min(23, Math.max(0, Number(m[1])));
    const min = Math.min(59, Math.max(0, Number(m[2])));
    const s = Math.min(59, Math.max(0, Number(m[3] ?? 0)));
    const d = new Date(now);
    d.setHours(h, min, s, 0);
    return d.toISOString();
  }

  return new Date().toISOString();
}

// Visible notifications come directly from server pagination/filtering
const visibleNotifications = computed(() => notifications.value);

// Nuevo selector: 'Hoy' o rango de fechas
const isTodayOnly = ref(true);
const notificationFrom = ref<string | null>(null); // ISO date string
const notificationTo = ref<string | null>(null); // ISO date string

const notificationPageSize = 20;
const notificationPage = ref(1);

const serverNotificationTotalPages = ref<number | null>(null);
const notificationTotalPages = computed(() => {
  if (serverNotificationTotalPages.value != null)
    return serverNotificationTotalPages.value;
  const total = visibleNotifications.value.length;
  return Math.max(1, Math.ceil(total / notificationPageSize));
});

// Cuando cambia el rango, la lógica que persiste/recarga ya se encarga de
// reiniciar la página y solicitar los datos al servidor. Evitamos reiniciar
// la página al actualizar `visibleNotifications` para no forzar regresar a
// la página 1 cuando cargamos una página desde el servidor.

watch(
  [notificationTotalPages, notificationPage],
  ([totalPages, page]) => {
    // Clamp page when list shrinks
    if (page > totalPages) notificationPage.value = totalPages;
    if (page < 1) notificationPage.value = 1;
  },
  { immediate: true }
);

// Cuando se cambia de página y estamos en la vista de notificaciones, pedirla al servidor
watch(notificationPage, (p) => {
  if (selectedFilter.value === "notificaciones") {
    void loadNotificationsFromServer(p);
  }
});

const pagedNotifications = computed(() => {
  // If server provides pagination, notifications already contain current page
  if (serverNotificationTotalPages.value != null) {
    return notifications.value;
  }
  const start = (notificationPage.value - 1) * notificationPageSize;
  return visibleNotifications.value.slice(start, start + notificationPageSize);
});

// In-page notification sounds (place files at public/sounds/coin.mp3, on.mp3, off.mp3)
const soundMap: Partial<Record<DashboardNotificationType, HTMLAudioElement>> = {
  coin_inserted: new Audio("/sounds/coin.mp3"),
  machine_on: new Audio("/sounds/on.mp3"),
  machine_off: new Audio("/sounds/off.mp3"),
};
Object.values(soundMap).forEach((s) => {
  try {
    s.preload = "auto";
  } catch (e) {
    /* ignore */
  }
});

function playSound(type: DashboardNotificationType) {
  try {
    if (
      typeof document !== "undefined" &&
      document.visibilityState !== "visible"
    )
      return;
    const audio = soundMap[type] ?? soundMap.coin_inserted;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play();
  } catch (e) {
    // ignore playback errors
  }
}

// backwards-compatible alias
function playNotificationSound() {
  playSound("coin_inserted");
}

const stateFilters = [
  "todas",
  "activas",
  "inactivas",
  "mantenimiento",
  "notificaciones",
] as const;
type Filter = (typeof stateFilters)[number];
const selectedFilter = ref<Filter>("todas");

// Filters visible in the tabs (exclude 'notificaciones' from the inline tabs)
const visibleStateFilters = computed(() =>
  stateFilters.filter((f) => f !== "notificaciones")
);

function setSelectedFilter(filter: Filter) {
  selectedFilter.value = filter;
  if (filter === "notificaciones") {
    unreadCount.value = 0;
    try {
      localStorage.setItem("notifications_last_seen", new Date().toISOString());
    } catch (e) {
      void e;
    }
    // Al abrir notificaciones, cargar la página actual desde el servidor
    void loadNotificationsFromServer(notificationPage.value);
  }
}

const availableLocations = computed(() => {
  const set = new Set<string>();
  for (const m of machines.value) {
    const loc = (m.location ?? "").trim();
    if (loc) set.add(loc);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
});

// Uso (tasa) calculado con power logs (backend) - se carga bajo demanda
const activeMinutesTodayByMachine = ref<Record<string, number>>({});
const usageLoading = ref(false);
const usageLastLoadedAt = ref<number | null>(null);
// Primer inicio (encendido) del día por máquina (si existe)
const firstOnTodayByMachine = ref<Record<string, string>>({});

function getTodayLocalStr() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthStartLocalStr() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function getWeekStartLocalStr() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 6); // últimos 7 días (incluye hoy)
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
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
    const firstMap: Record<string, string> = {};
    await Promise.all(
      scopedMachines.value.map(async (machine) => {
        try {
          const logs = await getMachinePowerLogs(machine.id, {
            startDate: todayLocalStr,
            endDate: todayLocalStr,
          });
          const activeMinutes = (logs || [])
            .filter((l) => l.event === "Encendido" && l.dur)
            .reduce((sum, l) => sum + Number(l.dur || 0), 0);
          map[machine.id] = activeMinutes;

          // Buscar el primer evento 'Encendido' del día (orden ascendente)
          const onEvents = (logs || [])
            .filter((l) => l.event === "Encendido" && l.ts)
            .map((l) => l.ts)
            .sort();
          if (onEvents.length) {
            firstMap[machine.id] = onEvents[0];
          }
        } catch (e) {
          map[machine.id] = 0;
        }
      })
    );
    activeMinutesTodayByMachine.value = map;
    firstOnTodayByMachine.value = firstMap;
    usageLastLoadedAt.value = Date.now();
  } finally {
    usageLoading.value = false;
  }
}

// Filtrado de máquinas según rol y filtro seleccionado
const filteredMachines = computed(() => {
  let baseMachines = scopedMachines.value;

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

  return baseMachines;
});

function onApplyFilters(payload: DashboardFilters) {
  dashboardFilters.value = payload;
  filterOpen.value = false;
}

// monedas por máquina (acumulado del mes actual): { [machineId]: coins_month_to_date }
const coinsByMachine = ref<Record<string, number>>({});
// monedas de HOY por máquina: { [machineId]: coins_today }
const dailyCoinsByMachine = ref<Record<string, number>>({});
// monedas de la última semana (incluye hoy) por máquina: { [machineId]: coins_last_7_days }
const weeklyCoinsByMachine = ref<Record<string, number>>({});

const totalMachines = computed(() => scopedMachines.value.length);
const activeMachines = computed(
  () => scopedMachines.value.filter((m) => m.status === "active").length
);
const inactiveMachines = computed(
  () => totalMachines.value - activeMachines.value
);
// Ingreso total en dinero HOY (se calcula a partir de las monedas de hoy por máquina)
const totalIncomeToday = computed(() =>
  scopedMachines.value.reduce(
    (sum, machine) => sum + getMachineIncomeToday(machine),
    0
  )
);

// Total de monedas recolectadas hoy (suma de `dailyCoinsByMachine`)
const totalCoinsToday = computed(() =>
  scopedMachines.value.reduce((sum, machine) => {
    return sum + (dailyCoinsByMachine.value[machine.id] || 0);
  }, 0)
);

const injectedDark = inject<Ref<boolean> | boolean>("darkMode", false);
const isDark = () => {
  if (typeof injectedDark === "boolean") return injectedDark;
  return !!injectedDark?.value;
};

function shouldShowNotificationForMachine(machineId: string): boolean {
  return canAccessMachine({
    role: currentRole.value,
    assignedMachineIds: assignedMachineIds.value,
    machineId: String(machineId),
    // NOTE: for notifications we only enforce assignment, not current status.
  });
}

function getMachineCoins(machineId: string): number {
  if (!canSeeMachineId(machineId)) return 0;
  return coinsByMachine.value[machineId] || 0;
}

function getMachineCoinsWeek(machineId: string): number {
  if (!canSeeMachineId(machineId)) return 0;
  return weeklyCoinsByMachine.value[machineId] || 0;
}

function getMachineCoinsToday(machineId: string): number {
  if (!canSeeMachineId(machineId)) return 0;
  return dailyCoinsByMachine.value[machineId] || 0;
}

function getMachineIncome(machine: Machine): number {
  const coins = getMachineCoins(machine.id);
  const valuePerCoin = machine.name.includes("Boxeo") ? 1 : 2;
  return coins * valuePerCoin;
}

function getMachineIncomeWeek(machine: Machine): number {
  const coins = getMachineCoinsWeek(machine.id);
  const valuePerCoin = machine.name.includes("Boxeo") ? 1 : 2;
  return coins * valuePerCoin;
}

function getMachineIncomeToday(machine: Machine): number {
  const coins = getMachineCoinsToday(machine.id);
  const valuePerCoin = machine.name.includes("Boxeo") ? 1 : 2;
  return coins * valuePerCoin;
}

function formatLastTime(ts?: string | null) {
  if (!ts) return "—";
  try {
    // If timestamp lacks timezone, treat as UTC then convert to America/Caracas
    let d = new Date(ts);
    // If parsing produced Invalid Date, return placeholder
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, {
      timeZone: "America/Caracas",
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (e) {
    return "—";
  }
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
      type: machine.type,
      id: machine.id,
    });
    machines.value = await getMachines();
  } catch (err: unknown) {
    console.error("Error al crear máquina:", err);
  }
}

async function handleUpdateMachine(payload: {
  id: string;
  name?: string;
  location: string;
  type?: string;
}) {
  try {
    const { id, name, location } = payload;
    // Build payload only with meaningful changes (avoid overwriting with empty strings)
    const updatePayload: any = {};
    if (
      location !== undefined &&
      location !== null &&
      String(location).trim() !== ""
    ) {
      updatePayload.location = String(location);
    }
    if (name !== undefined && name !== null && String(name).trim() !== "") {
      updatePayload.name = String(name);
    }
    if (
      payload.type !== undefined &&
      payload.type !== null &&
      String(payload.type).trim() !== ""
    ) {
      updatePayload.type = String(payload.type);
    }

    if (Object.keys(updatePayload).length === 0) {
      showToast(
        "Sin cambios",
        "No se detectaron campos modificados",
        "event",
        3000
      );
      return;
    }

    console.log("Updating machine", id, updatePayload);
    const resp = await updateMachine(id, updatePayload);
    console.log("updateMachine response", resp);

    // Try to refresh the specific machine from server to ensure backend state is reflected
    try {
      const fresh = await getMachines();
      machines.value = fresh;
      showToast(
        "Máquina actualizada",
        `Se guardaron los cambios en ${resp.name || id}`,
        "event",
        3000
      );
    } catch (e) {
      // fallback: update local entry
      machines.value = machines.value.map((m) =>
        m.id === id ? { ...m, ...(updatePayload as any) } : m
      );
      showToast(
        "Máquina actualizada (cache)",
        `Se actualizaron los datos localmente.`,
        "event",
        3000
      );
    }
  } catch (e) {
    console.error("Error actualizando máquina:", e);
    try {
      const anyE = e as any;
      const msg =
        anyE?.response?.data?.message || anyE?.message || "Error desconocido";
      showToast("Error al actualizar", String(msg), "event", 5000);
    } catch (ee) {
      showToast("Error al actualizar", "Error desconocido", "event", 5000);
    }
  } finally {
    // close modal
    newMachineOpen.value = false;
    machineToEdit.value = null;
    newMachineMode.value = "create";
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

async function toggleTestMode(machine: Machine) {
  if (!isAdmin.value) return;
  // Toggle a separate test_mode flag so it doesn't affect on/off status
  const newTest = (machine as any).test_mode ? false : true;
  try {
    await updateMachine(machine.id, { test_mode: newTest });
    machines.value = machines.value.map((m) =>
      m.id === machine.id ? { ...m, test_mode: newTest } : m
    );
  } catch (err) {
    console.error("Error actualizando modo prueba de máquina:", err);
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
}

function getNotificationTitle(n: DashboardNotification) {
  if (n.type === "machine_on") return "Máquina encendida";
  if (n.type === "machine_off") return "Máquina apagada";
  if (n.type === "coin_inserted") return "Moneda ingresada";
  return "Nuevo evento";
}

function getNotificationDetailLine(n: DashboardNotification) {
  if (n.type === "coin_inserted") {
    const amount = Number(n.amount ?? 1) || 1;
    return `+${amount} moneda(s)`;
  }
  return (n.detail || "").trim();
}

function getNotificationCardClass(n: DashboardNotification) {
  const dark = isDark();
  if (n.type === "machine_on") {
    return dark
      ? "border-emerald-900/60 bg-emerald-950/20"
      : "border-emerald-100/80 bg-emerald-50/40";
  }
  if (n.type === "machine_off") {
    return dark
      ? "border-red-900/60 bg-red-950/20"
      : "border-red-100/80 bg-red-50/40";
  }
  if (n.type === "coin_inserted") {
    return dark
      ? "border-amber-900/60 bg-amber-950/20"
      : "border-amber-100/80 bg-amber-50/40";
  }
  return dark
    ? "border-slate-700/60 bg-slate-950/20"
    : "border-slate-200/70 bg-white/40";
}

function getNotificationDotClass(n: DashboardNotification) {
  if (n.type === "machine_on") return "bg-emerald-500";
  if (n.type === "machine_off") return "bg-red-500";
  if (n.type === "coin_inserted") return "bg-amber-400";
  return isDark() ? "bg-slate-500" : "bg-slate-400";
}

function getNotificationTitleTextClass(n: DashboardNotification) {
  const dark = isDark();
  if (n.type === "machine_on")
    return dark ? "text-emerald-200" : "text-emerald-700";
  if (n.type === "machine_off") return dark ? "text-red-200" : "text-red-700";
  if (n.type === "coin_inserted")
    return dark ? "text-amber-200" : "text-amber-700";
  return "";
}

function addDashboardNotification(input: {
  type: DashboardNotificationType;
  machineId: string;
  machineName?: string;
  location?: string;
  timestamp?: string;
  amount?: number;
  detail?: string;
}) {
  const machineId = String(input.machineId ?? "");
  if (!machineId || !shouldShowNotificationForMachine(machineId)) return;

  const machine = machines.value.find((m) => String(m.id) === machineId);
  const machineName =
    input.machineName || machine?.name || `Máquina ${machineId}`;
  const location = input.location || machine?.location;
  const ts = normalizeTimestamp(input.timestamp || new Date().toISOString());

  const id = notificationCounter++;
  const n: DashboardNotification = {
    id,
    type: input.type,
    machineId,
    machineName,
    location,
    timestamp: String(ts),
    ...(input.amount !== undefined ? { amount: input.amount } : {}),
    ...(input.detail ? { detail: input.detail } : {}),
  };

  notifications.value.unshift(n);

  // Mostrar toast breve para la notificación entrante (más descriptivo)
  try {
    const title = getNotificationTitle(n);
    let body = "";
    if (n.type === "coin_inserted") {
      const amt = Number(n.amount ?? 1) || 1;
      body = `${n.machineName} • +${amt} moneda(s) • ${formatNotificationTime(
        String(n.timestamp)
      )}`;
    } else if (n.type === "machine_on" || n.type === "machine_off") {
      body = `${n.machineName} • ${formatNotificationTime(
        String(n.timestamp)
      )}`;
      if (n.detail) body += ` • ${n.detail}`;
    } else {
      body = `${n.machineName} • ${formatNotificationTime(
        String(n.timestamp)
      )}`;
      if (n.detail) body += ` • ${n.detail}`;
    }
    showToast(title, body, n.type);
  } catch (e) {
    /* ignore */
  }

  // Incrementar no-leídas solo si no está viendo la vista de notificaciones
  if (selectedFilter.value !== "notificaciones") {
    unreadCount.value = (unreadCount.value || 0) + 1;
  }

  // Mantener historial en localStorage (persistente)
  // persistencia local deshabilitada; historial solo viene del backend en cada carga
  // Si estamos usando paginación servidor (serverNotificationTotalPages != null)
  // y el usuario está viendo la vista de notificaciones, recargar la página 1
  // desde el servidor para que el historial se actualice inmediatamente.
  try {
    if (
      typeof serverNotificationTotalPages.value !== "undefined" &&
      serverNotificationTotalPages.value != null &&
      typeof selectedFilter.value !== "undefined" &&
      selectedFilter.value === "notificaciones"
    ) {
      // loadNotificationsFromServer está definida en este módulo más abajo
      void loadNotificationsFromServer(1);
    }
  } catch (e) {
    // no bloquear en fallos de refresco
  }
}

// Variante silenciosa: añade notificación sin afectar contador de no-leídos
function addDashboardNotificationSilent(
  input: Parameters<typeof addDashboardNotification>[0]
) {
  const machineId = String(input.machineId ?? "");
  if (!machineId || !shouldShowNotificationForMachine(machineId)) return;

  const machine = machines.value.find((m) => String(m.id) === machineId);
  const machineName =
    input.machineName || machine?.name || `Máquina ${machineId}`;
  const location = input.location || machine?.location;
  const ts = normalizeTimestamp(input.timestamp || new Date().toISOString());

  const id = notificationCounter++;
  const n: DashboardNotification = {
    id,
    type: input.type,
    machineId,
    machineName,
    location,
    timestamp: String(ts),
    ...(input.amount !== undefined ? { amount: input.amount } : {}),
    ...(input.detail ? { detail: input.detail } : {}),
  };
  notifications.value.unshift(n);
  // persistencia local deshabilitada
}

function formatNotificationDate(ts: string) {
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

function formatNotificationTime(ts: string) {
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleTimeString();
  } catch {
    return ts;
  }
}

// Cargar notificaciones desde el backend con paginación
async function loadNotificationsFromServer(page = 1) {
  try {
    const params: any = { page, pageSize: notificationPageSize };
    if (isTodayOnly.value) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      params.startDate = start.toISOString();
      params.endDate = new Date().toISOString();
    } else {
      if (notificationFrom.value) {
        // Parse YYYY-MM-DD explicitly to avoid Date(string) timezone quirks
        const parts = String(notificationFrom.value).split("-").map(Number);
        if (parts.length === 3) {
          const s = new Date(
            parts[0],
            (parts[1] || 1) - 1,
            parts[2],
            0,
            0,
            0,
            0
          );
          params.startDate = s.toISOString();
        }
      }
      if (notificationTo.value) {
        // Construct end-of-day locally to include the full selected day
        const parts = String(notificationTo.value).split("-").map(Number);
        if (parts.length === 3) {
          const t = new Date(
            parts[0],
            (parts[1] || 1) - 1,
            parts[2],
            23,
            59,
            59,
            999
          );
          params.endDate = t.toISOString();
        }
      }
    }

    const resp = await getIotEvents(params);
    const evs = resp.events || [];
    // Mapear eventos a la estructura de notificaciones
    const mapped: DashboardNotification[] = evs.map((ev: any, idx: number) => {
      const type = String(
        ev.type || ev.event || "event"
      ) as DashboardNotificationType;
      const machineId = String(ev.machine_id || ev.machineId || "");
      const ts = String(ev.timestamp || ev.ts || new Date().toISOString());
      return {
        id: Number(ev.id ?? 0) || notificationCounter++,
        type,
        machineId,
        machineName:
          ev.machine_name || ev.machineName || `Máquina ${machineId}`,
        location: ev.location,
        timestamp: ts,
        ...(ev.data?.cantidad || ev.amount
          ? { amount: Number(ev.data?.cantidad ?? ev.amount) }
          : {}),
        ...(ev.data?.reason ? { detail: String(ev.data.reason) } : {}),
      } as DashboardNotification;
    });

    // Restringir notificaciones según máquinas asignadas
    notifications.value = mapped.filter((n) =>
      shouldShowNotificationForMachine(String(n.machineId || ""))
    );
    serverNotificationTotalPages.value = resp.totalPages || 1;
    notificationPage.value = resp.page || page;

    // Ajustar counter por seguridad para evitar ids duplicados
    try {
      const maxId = notifications.value.reduce(
        (mx, n) => Math.max(mx, Number(n.id) || 0),
        0
      );
      notificationCounter = Math.max(notificationCounter, maxId + 1);
    } catch (e) {
      /* ignore */
    }

    // Recalcular no-leídos según último visto
    try {
      const lastSeen = localStorage.getItem("notifications_last_seen");
      if (!lastSeen) {
        unreadCount.value = 0;
      } else {
        const last = new Date(lastSeen).getTime();
        if (Number.isNaN(last)) {
          unreadCount.value = 0;
        } else {
          unreadCount.value = notifications.value.filter((n) => {
            const t = new Date(n.timestamp).getTime();
            return !Number.isNaN(t) && t > last;
          }).length;
        }
      }
    } catch (e) {
      unreadCount.value = 0;
    }
  } catch (e) {
    console.warn("No se pudieron obtener eventos del backend:", e);
  }
}

async function loadDashboardData() {
  try {
    machines.value = await getMachines();

    const visibleMachines = scopedMachines.value;
    // Cargar monedas por máquina (mes actual) + monedas de HOY (usando fecha local)
    try {
      const todayLocalStr = getTodayLocalStr();
      const monthStartLocalStr = getMonthStartLocalStr();
      const weekStartLocalStr = getWeekStartLocalStr();
      const startLocalStr =
        weekStartLocalStr < monthStartLocalStr
          ? weekStartLocalStr
          : monthStartLocalStr;
      const monthMap: Record<string, number> = {};
      const dailyMap: Record<string, number> = {};
      const weekMap: Record<string, number> = {};

      await Promise.all(
        visibleMachines.map(async (machine) => {
          try {
            const rows = await getMachineDailyIncome(machine.id, {
              startDate: startLocalStr,
              endDate: todayLocalStr,
            });

            let coinsMonth = 0;
            let coinsToday = 0;
            let coinsWeek = 0;
            if (Array.isArray(rows) && rows.length) {
              for (const r of rows) {
                const dateStr = String((r as any)?.date ?? "").slice(0, 10);
                const inc = Number((r as any)?.income ?? 0);
                if (!Number.isFinite(inc)) continue;
                if (dateStr >= monthStartLocalStr && dateStr <= todayLocalStr) {
                  coinsMonth += inc;
                }
                if (dateStr === todayLocalStr) coinsToday = inc;
                if (dateStr >= weekStartLocalStr && dateStr <= todayLocalStr) {
                  coinsWeek += inc;
                }
              }
            }

            monthMap[machine.id] = coinsMonth;
            dailyMap[machine.id] = coinsToday;
            weekMap[machine.id] = coinsWeek;
          } catch (err) {
            console.error(
              "Error obteniendo monedas del mes para máquina:",
              machine.id,
              err
            );
            monthMap[machine.id] = 0;
            dailyMap[machine.id] = 0;
            weekMap[machine.id] = 0;
          }
        })
      );

      coinsByMachine.value = monthMap;
      dailyCoinsByMachine.value = dailyMap;
      weeklyCoinsByMachine.value = weekMap;
      // Asegurar que tenemos los logs de energía para calcular el primer
      // encendido del día por máquina, de modo que la UI muestre
      // ese instante en lugar del último encendido.
      try {
        await ensureUsageDataFresh();
      } catch (e) {
        // ignorar fallos no bloqueantes
      }
    } catch (e) {
      console.error("Error obteniendo monedas del mes por máquina:", e);
      coinsByMachine.value = {};
      dailyCoinsByMachine.value = {};
      weeklyCoinsByMachine.value = {};
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
let machineOnHandler: ((payload: any) => void) | null = null;
let machineOffHandler: ((payload: any) => void) | null = null;
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
      const machineId = String(payload.machineId ?? payload.machine_id ?? "");
      const amount = Number(payload.amount ?? payload.data?.cantidad ?? 1) || 1;
      const ts = payload.timestamp || payload.ts || new Date().toISOString();

      if (!machineId || !shouldShowNotificationForMachine(machineId)) return;

      // Fecha local del evento para saber si cuenta como "hoy"
      let eventLocalDate = "";
      try {
        const d = new Date(String(ts));
        if (!Number.isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          eventLocalDate = `${year}-${month}-${day}`;
        }
      } catch (e) {
        void e;
      }
      const todayLocalStr = getTodayLocalStr();

      const machine = machines.value.find((m) => String(m.id) === machineId);
      const machineName =
        payload.machineName || machine?.name || `Máquina ${machineId}`;
      const location = payload.location || machine?.location;

      addDashboardNotification({
        type: "coin_inserted",
        machineId,
        machineName,
        location,
        amount,
        timestamp: String(ts),
      });

      // Update local coin counters so UI updates immediately
      try {
        // If the machine is in 'test' mode (test_mode flag), do not count the coin
        if (!(machine as any)?.test_mode) {
          coinsByMachine.value = {
            ...coinsByMachine.value,
            [machineId]: (coinsByMachine.value[machineId] || 0) + amount,
          };
          if (!eventLocalDate || eventLocalDate === todayLocalStr) {
            dailyCoinsByMachine.value = {
              ...dailyCoinsByMachine.value,
              [machineId]: (dailyCoinsByMachine.value[machineId] || 0) + amount,
            };
          }
        } else {
          // Machine in test mode: skip counting. Optionally annotate notification detail.
        }
      } catch (e) {
        // ignore
      }

      // Reproducir sonido en la página (si está visible)
      try {
        playNotificationSound();
      } catch (e) {
        /* ignore */
      }

      // Además del toast en la UI, mostrar notificación del sistema
      // Sólo si la página NO está visible para evitar duplicados con el SW
      try {
        if (
          typeof document !== "undefined" &&
          document.visibilityState !== "visible"
        ) {
          if ("Notification" in window) {
            if (Notification.permission === "granted") {
              const title = "Moneda ingresada";
              const bodyParts = [machineName];
              if (location) bodyParts.push(`• ${location}`);
              bodyParts.push(`+${amount} moneda(s)`);
              bodyParts.push(`• ${formatNotificationTime(String(ts))}`);
              const body = bodyParts.join(" ");
              new Notification(title, {
                body,
                icon: "/img/icons/K11BOX.webp",
              });
            } else if (Notification.permission === "default") {
              Notification.requestPermission();
            }
          }
        }
      } catch (e) {
        console.warn("No se pudo mostrar la notificación del sistema:", e);
      }
    };
    coinSocket.on("coin_inserted", coinHandler);

    // Encendido / apagado: actualizar estado localmente para evitar esperar al polling
    machineOnHandler = async (payload: any) => {
      try {
        const machineId = String(payload.machineId ?? payload.machine_id ?? "");
        const ts = payload.timestamp || payload.ts || new Date().toISOString();

        if (!machineId || !shouldShowNotificationForMachine(machineId)) return;

        const idx = machines.value.findIndex((m) => String(m.id) === machineId);
        if (idx >= 0) {
          const updated = {
            ...machines.value[idx],
            status: "active",
            last_on: String(ts),
          };
          machines.value = machines.value.map((m, i) =>
            i === idx ? updated : m
          );
        } else {
          await loadDashboardData();
        }
        addDashboardNotification({
          type: "machine_on",
          machineId,
          machineName: payload.machineName,
          location: payload.location,
          timestamp: String(ts),
          detail: payload.data?.reason
            ? String(payload.data.reason)
            : undefined,
        });
        try {
          playSound("machine_on");
        } catch (e) {
          /* ignore */
        }
      } catch (e) {
        /* ignore */
      }
    };
    machineOffHandler = async (payload: any) => {
      try {
        const machineId = String(payload.machineId ?? payload.machine_id ?? "");
        const ts = payload.timestamp || payload.ts || new Date().toISOString();

        if (!machineId || !shouldShowNotificationForMachine(machineId)) return;

        const idx = machines.value.findIndex((m) => String(m.id) === machineId);
        if (idx >= 0) {
          const updated = {
            ...machines.value[idx],
            status: "inactive",
            last_off: String(ts),
          };
          machines.value = machines.value.map((m, i) =>
            i === idx ? updated : m
          );
        } else {
          await loadDashboardData();
        }
        addDashboardNotification({
          type: "machine_off",
          machineId,
          machineName: payload.machineName,
          location: payload.location,
          timestamp: String(ts),
          detail: payload.data?.reason
            ? String(payload.data.reason)
            : undefined,
        });
        try {
          playSound("machine_off");
        } catch (e) {
          /* ignore */
        }
      } catch (e) {
        /* ignore */
      }
    };
    coinSocket.on("machine_on", machineOnHandler);
    coinSocket.on("machine_off", machineOffHandler);
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
          if (!msg) return;
          // Compatibilidad: mensajes viejos (coin_notification)
          if (msg.type === "coin_notification") {
            // Mensaje legado sin machineId; evitar notificaciones genéricas en roles restringidos
            if (currentRole.value === "admin") playNotificationSound();
            return;
          }
          // Nuevo: el SW envía { type: 'event_notification', payload }
          if (msg.type === "event_notification") {
            const payload = msg.payload || {};
            const eventType = String(
              payload.eventType || payload.type || ""
            ) as DashboardNotificationType;
            const machineId = String(
              payload.machine_id ?? payload.machineId ?? ""
            );
            const ts =
              payload.timestamp || payload.ts || new Date().toISOString();

            if (!machineId || !shouldShowNotificationForMachine(machineId))
              return;

            if (eventType === "coin_inserted") {
              const amount =
                Number(payload.amount ?? payload.data?.cantidad ?? 1) || 1;
              // Sólo procesar mensaje del SW si la página NO está visible,
              // en caso contrario el socket ya lo habrá manejado y evitamos duplicados.
              if (
                typeof document === "undefined" ||
                document.visibilityState !== "visible"
              ) {
                addDashboardNotification({
                  type: "coin_inserted",
                  machineId,
                  amount,
                  timestamp: String(ts),
                });
                playNotificationSound();
              }
              return;
            }
            if (eventType === "machine_on" || eventType === "machine_off") {
              // Only let the Service Worker drive UI updates when the page
              // is not visible (socket will handle visible clients).
              const shouldProcessFromSW =
                typeof document === "undefined" ||
                document.visibilityState !== "visible";
              if (shouldProcessFromSW) {
                addDashboardNotification({
                  type: eventType,
                  machineId,
                  timestamp: String(ts),
                  detail: payload.data?.reason
                    ? String(payload.data.reason)
                    : undefined,
                });
                try {
                  playSound(eventType as DashboardNotificationType);
                } catch (e) {
                  /* ignore */
                }
              }
              return;
            }
            // Ignorar eventos genéricos enviados por el Service Worker
            // para evitar mostrar notificaciones "Nuevo evento" redundantes
            // (si se requiere procesar tipos nuevos, añadirlos explícitamente arriba).
            console.debug("SW: ignoring generic event notification", payload);
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

  // No se cargan notificaciones desde localStorage: el historial proviene del backend

  // Restaurar preferencia de notificaciones: 'Hoy' o rango desde/hasta
  try {
    const storedToday = localStorage.getItem("notifications_today");
    const storedFrom = localStorage.getItem("notifications_from");
    const storedTo = localStorage.getItem("notifications_to");
    if (storedToday === "true") {
      isTodayOnly.value = true;
      notificationFrom.value = null;
      notificationTo.value = null;
    } else {
      isTodayOnly.value = false;
      notificationFrom.value = storedFrom || null;
      notificationTo.value = storedTo || null;
    }
  } catch (e) {
    /* ignore */
  }

  // Cargar notificaciones/página inicial desde el backend usando la preferencia restaurada
  try {
    await loadNotificationsFromServer(notificationPage.value);
  } catch (e) {
    console.warn("No se pudieron obtener eventos del backend:", e);
  }

  // Inicializar contador de no-leídos según historial (si hay)
  try {
    const lastSeen = localStorage.getItem("notifications_last_seen");
    if (!lastSeen) {
      // Si no hay referencia de lectura previa asumimos que ya se leyeron
      unreadCount.value = 0;
    } else {
      const last = new Date(lastSeen).getTime();
      if (Number.isNaN(last)) {
        unreadCount.value = 0;
      } else {
        unreadCount.value = notifications.value.filter((n) => {
          const t = new Date(n.timestamp).getTime();
          return !Number.isNaN(t) && t > last;
        }).length;
      }
    }
  } catch (e) {
    unreadCount.value = 0;
  }

  // Persistir cambios en la preferencia de notificaciones y recargar
  watch(
    [isTodayOnly, notificationFrom, notificationTo],
    () => {
      try {
        localStorage.setItem("notifications_today", String(isTodayOnly.value));
        if (notificationFrom.value)
          localStorage.setItem("notifications_from", notificationFrom.value);
        else localStorage.removeItem("notifications_from");
        if (notificationTo.value)
          localStorage.setItem("notifications_to", notificationTo.value);
        else localStorage.removeItem("notifications_to");
      } catch (e) {
        /* ignore */
      }
      notificationPage.value = 1;
      void loadNotificationsFromServer(1);
    },
    { immediate: false }
  );

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
  if (coinSocket && machineOnHandler) {
    coinSocket.off("machine_on", machineOnHandler);
  }
  if (coinSocket && machineOffHandler) {
    coinSocket.off("machine_off", machineOffHandler);
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
</script>

<template>
  <AppSidebar
    :open="sidebarOpen"
    :dark="isDark()"
    @close="sidebarOpen = false"
    @open="filterOpen = false"
  />
  <NewMachine
    v-if="isAdmin"
    :open="newMachineOpen"
    :mode="newMachineMode"
    :machine-to-edit="machineToEdit || undefined"
    :count="machines.length"
    :machines="machines"
    :dark="isDark()"
    @close="closeNewMachine"
    @create="handleNewMachine"
    @update="handleUpdateMachine"
  />

  <Teleport to="body">
    <div v-if="toast" class="fixed top-4 right-4 z-[9999]">
      <div
        :class="[
          'rounded-lg px-4 py-3 shadow-lg w-auto max-w-xs',
          // base light/dark
          isDark() ? 'text-white' : 'text-slate-800',
          // type-specific accents
          toast?.type === 'coin_inserted'
            ? isDark()
              ? 'bg-amber-900/20 border border-amber-700 text-amber-200'
              : 'bg-amber-50 border border-amber-200 text-amber-800'
            : toast?.type === 'machine_on'
            ? isDark()
              ? 'bg-emerald-900/20 border border-emerald-700 text-emerald-200'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : toast?.type === 'machine_off'
            ? isDark()
              ? 'bg-red-900/20 border border-red-700 text-red-200'
              : 'bg-red-50 border border-red-200 text-red-800'
            : isDark()
            ? 'bg-slate-900 border border-slate-700/60 text-white'
            : 'bg-white border border-slate-200/70 text-slate-800',
        ]"
      >
        <div class="flex items-start gap-3">
          <div class="flex-1">
            <p class="font-semibold text-sm">{{ toast.title }}</p>
            <p
              v-if="toast.body"
              class="text-xs"
              :class="isDark() ? 'text-slate-300' : 'text-slate-600'"
            >
              {{ toast.body }}
            </p>
          </div>
          <button
            type="button"
            class="ml-2 text-slate-400 hover:text-slate-600"
            @click="hideToast"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  </Teleport>

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
        <!-- Refrescar (antes: botón de notificaciones) -->
        <div class="shrink-0">
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full border transition cursor-pointer"
            :class="
              isDark()
                ? 'border-red-400/30 bg-red-950/10 text-red-100 hover:bg-red-950/20'
                : 'border-red-200/80 bg-red-50/60 text-red-700 hover:bg-red-50/80'
            "
            aria-label="Refrescar"
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
            Monedas recolectadas hoy
          </p>
          <p class="text-2xl font-semibold text-slate-900">
            {{ totalCoinsToday }}
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
          v-if="isAdmin"
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
    <div class="flex flex-wrap items-center gap-2 mb-4 relative">
      <button
        v-for="filter in visibleStateFilters"
        :key="filter"
        @click="setSelectedFilter(filter)"
        :class="[
          'px-3 py-1 rounded-full font-medium text-xs sm:text-sm cursor-pointer transition',
          selectedFilter === filter
            ? 'bg-slate-900 text-white hover:bg-slate-800'
            : 'bg-white/50 backdrop-blur text-slate-600 border border-slate-200/70 hover:bg-white/70',
        ]"
      >
        <span class="inline-flex items-center gap-2">
          <span>
            {{ filter.charAt(0).toUpperCase() + filter.slice(1) }}
          </span>
        </span>
      </button>

      <!-- Campanita con etiqueta: fija al lado de las tabs (visible en móvil y escritorio) -->
      <div
        class="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2"
      >
        <div class="relative">
          <button
            type="button"
            @click.stop="setSelectedFilter('notificaciones')"
            class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition"
            :class="
              isDark()
                ? 'bg-slate-900 text-white border border-slate-700/60'
                : 'bg-white/50 text-slate-700 border border-slate-200/70'
            "
          >
            <svg
              class="h-4 w-4"
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
          </button>
          <span
            v-if="unreadCount"
            class="absolute -top-2 -right-2 inline-flex items-center justify-center bg-red-600 text-white text-[10px] font-bold rounded-full w-5 h-5"
            >{{ unreadCount }}</span
          >
        </div>
      </div>
    </div>

    <!-- Vista de notificaciones (inline, como Activas/Inactivas) -->
    <section
      v-if="selectedFilter === 'notificaciones'"
      class="rounded-2xl border bg-white/60 backdrop-blur-xl p-4 shadow-sm sm:p-6 border-slate-200/70"
      :class="
        isDark()
          ? 'bg-slate-900/40 border-slate-700/60 text-white'
          : 'bg-white/60 border-slate-200/70 text-slate-900'
      "
    >
      <div
        class="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <h2 class="text-sm font-semibold">Historial de notificaciones</h2>
        <div
          class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
        >
          <button
            type="button"
            class="px-3 py-1 rounded-full text-xs font-semibold border transition"
            :class="
              isTodayOnly
                ? 'bg-slate-900 text-white border-slate-900'
                : isDark()
                ? 'bg-slate-950/10 text-slate-200 border-slate-700/60 hover:bg-slate-950/20'
                : 'bg-white/40 text-slate-700 border-slate-200/70 hover:bg-white/60'
            "
            @click="
              isTodayOnly = true;
              notificationFrom = null;
              notificationTo = null;
              loadNotificationsFromServer(1);
            "
          >
            Hoy
          </button>

          <div
            class="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto"
          >
            <input
              type="date"
              v-model="notificationFrom"
              class="px-3 py-2 rounded text-sm border w-full sm:w-36 placeholder-slate-400"
              :class="
                isDark()
                  ? 'bg-slate-900 text-slate-200 border-slate-700/60 placeholder-slate-400'
                  : 'bg-white/90 text-slate-700 border-slate-200/70 placeholder-slate-400'
              "
            />
            <div
              class="flex items-center justify-center text-xs text-slate-400 py-1"
            >
              a
            </div>
            <input
              type="date"
              v-model="notificationTo"
              class="px-3 py-2 rounded text-sm border w-full sm:w-36 placeholder-slate-400"
              :class="
                isDark()
                  ? 'bg-slate-900 text-slate-200 border-slate-700/60 placeholder-slate-400'
                  : 'bg-white/90 text-slate-700 border-slate-200/70 placeholder-slate-400'
              "
            />
            <button
              type="button"
              class="px-3 py-2 rounded-full text-sm font-semibold border transition w-full sm:w-auto"
              :class="
                isTodayOnly
                  ? isDark()
                    ? 'bg-slate-950/10 text-slate-200 border-slate-700/60'
                    : 'bg-white/40 text-slate-700 border-slate-200/70'
                  : 'bg-slate-900 text-white border-slate-900'
              "
              @click="
                () => {
                  isTodayOnly = false;
                  loadNotificationsFromServer(1);
                }
              "
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>

      <div v-if="!visibleNotifications.length" class="text-xs text-slate-400">
        No hay notificaciones
      </div>

      <div v-else class="space-y-2 max-h-[520px] overflow-auto pr-1">
        <div
          v-for="n in pagedNotifications"
          :key="n.id"
          class="rounded-xl border p-3"
          :class="getNotificationCardClass(n)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2 min-w-0">
                <span
                  class="mt-0.5 h-2.5 w-2.5 rounded-full shrink-0"
                  :class="getNotificationDotClass(n)"
                  aria-hidden="true"
                ></span>
                <p
                  class="text-xs font-semibold truncate"
                  :class="getNotificationTitleTextClass(n)"
                >
                  {{ getNotificationTitle(n) }}
                </p>
              </div>
              <p
                class="text-[12px] text-slate-500 truncate"
                :class="isDark() ? 'text-slate-400' : ''"
              >
                {{ n.machineName }}
                <span v-if="n.location">• {{ n.location }}</span>
              </p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-[11px] text-slate-400">
                {{ formatNotificationDate(n.timestamp) }}
              </p>
              <p class="text-[11px] text-slate-400">
                {{ formatNotificationTime(n.timestamp) }}
              </p>
            </div>
          </div>
          <p
            v-if="getNotificationDetailLine(n)"
            class="mt-1 text-xs"
            :class="isDark() ? 'text-slate-300' : 'text-slate-600'"
          >
            {{ getNotificationDetailLine(n) }}
          </p>
        </div>
      </div>

      <div
        v-if="visibleNotifications.length && notificationTotalPages > 1"
        class="mt-4 flex items-center justify-between gap-2"
      >
        <button
          type="button"
          class="px-3 py-1 rounded-full text-xs font-semibold border transition"
          :disabled="notificationPage <= 1"
          :class="[
            notificationPage <= 1
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer',
            isDark()
              ? 'bg-slate-950/10 text-slate-200 border-slate-700/60 hover:bg-slate-950/20'
              : 'bg-white/40 text-slate-700 border-slate-200/70 hover:bg-white/60',
          ]"
          @click="notificationPage = Math.max(1, notificationPage - 1)"
        >
          Anterior
        </button>

        <p class="text-[11px] text-slate-400">
          Página {{ notificationPage }} de {{ notificationTotalPages }}
        </p>

        <button
          type="button"
          class="px-3 py-1 rounded-full text-xs font-semibold border transition"
          :disabled="notificationPage >= notificationTotalPages"
          :class="[
            notificationPage >= notificationTotalPages
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer',
            isDark()
              ? 'bg-slate-950/10 text-slate-200 border-slate-700/60 hover:bg-slate-950/20'
              : 'bg-white/40 text-slate-700 border-slate-200/70 hover:bg-white/60',
          ]"
          @click="
            notificationPage = Math.min(
              notificationTotalPages,
              notificationPage + 1
            )
          "
        >
          Siguiente
        </button>
      </div>
    </section>
    <section
      v-else
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
            class="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-slate-50 text-slate-600"
            @click="toggleTestMode(machine)"
          >
            <div class="flex items-center gap-2">
              <span
                v-if="machine && machine.test_mode"
                class="h-1.5 w-1.5 rounded-full bg-amber-400"
              ></span>
              <span class="text-[11px]">
                {{
                  machine && machine.test_mode
                    ? "Quitar modo prueba"
                    : "Activar modo prueba"
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
          <!-- Edit action removed to avoid runtime error assigning refs -->
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
          <span
            v-if="machine && machine.test_mode"
            class="ml-2 inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium"
            :class="
              isDark()
                ? 'bg-emerald-900/60 text-emerald-100'
                : 'bg-emerald-50 text-emerald-700'
            "
          >
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Prueba
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
            Total semanal
          </p>
          <p
            v-if="!isOperator"
            class="text-right text-slate-800"
            :class="isDark() ? 'text-slate-100' : ''"
          >
            $ {{ getMachineIncomeWeek(machine) }}
          </p>
          <p class="font-medium text-slate-400">Monedas hoy</p>
          <p
            class="text-right text-slate-800"
            :class="isDark() ? 'text-slate-100' : ''"
          >
            {{ getMachineCoinsToday(machine.id) }}
          </p>
        </div>

        <div class="mb-3 space-y-1 text-[11px] text-slate-400">
          <p>
            Primer inicio:
            {{
              formatLastTime(
                firstOnTodayByMachine[machine.id] || machine.last_on
              )
            }}
          </p>
          <p>Último cierre: {{ formatLastTime(machine.last_off) }}</p>
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
