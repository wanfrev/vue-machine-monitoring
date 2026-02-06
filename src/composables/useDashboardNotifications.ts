import { ref, computed, watch, type Ref } from "vue";
import { getIotEvents } from "@/api/client";
import { formatNotificationTime } from "@/utils/date";
import type {
  DashboardFilterKey,
  DashboardNotification,
  DashboardNotificationType,
} from "@/types/dashboard";

export type {
  DashboardFilterKey,
  DashboardNotification,
  DashboardNotificationType,
} from "@/types/dashboard";

type AddNotificationInput = {
  type: DashboardNotificationType;
  machineId: string;
  machineName?: string;
  location?: string;
  timestamp?: string;
  amount?: number;
  detail?: string;
};

type UseDashboardNotificationsOptions = {
  selectedFilter: Ref<DashboardFilterKey>;
  shouldShowNotificationForMachine: (machineId: string) => boolean;
  showToast: (
    title: string,
    body?: string,
    type?: DashboardNotificationType | "event",
    duration?: number
  ) => void;
};

export function useDashboardNotifications(
  options: UseDashboardNotificationsOptions
) {
  const notifications = ref<DashboardNotification[]>([]);
  const unreadCount = ref(0);
  const isTodayOnly = ref(true);
  const notificationFrom = ref<string | null>(null);
  const notificationTo = ref<string | null>(null);
  const notificationPage = ref(1);
  const notificationPageSize = 20;
  const serverNotificationTotalPages = ref<number | null>(null);
  let notificationCounter = 1;

  const visibleNotifications = computed(() => notifications.value);

  const notificationTotalPages = computed(() => {
    if (serverNotificationTotalPages.value != null) {
      return serverNotificationTotalPages.value || 1;
    }
    return Math.max(
      1,
      Math.ceil(visibleNotifications.value.length / notificationPageSize)
    );
  });

  const pagedNotifications = computed(() => {
    if (serverNotificationTotalPages.value != null) {
      return visibleNotifications.value;
    }
    const start = (notificationPage.value - 1) * notificationPageSize;
    return visibleNotifications.value.slice(
      start,
      start + notificationPageSize
    );
  });

  function normalizeTimestamp(ts: string) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  }

  function getNotificationTitle(n: DashboardNotification) {
    if (n.type === "machine_on") return "Máquina encendida";
    if (n.type === "machine_off") return "Máquina apagada";
    if (n.type === "coin_inserted") return "Moneda ingresada";
    return "Nuevo evento";
  }

  function markNotificationsSeen() {
    try {
      localStorage.setItem("notifications_last_seen", new Date().toISOString());
    } catch (e) {
      /* ignore */
    }
    unreadCount.value = 0;
  }

  function recalcUnreadCountFromLastSeen() {
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
  }

  function addDashboardNotification(input: AddNotificationInput) {
    const machineId = String(input.machineId ?? "");
    if (!machineId || !options.shouldShowNotificationForMachine(machineId)) {
      return;
    }

    const machineName = input.machineName || `Máquina ${machineId}`;
    const location = input.location;
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
      options.showToast(title, body, n.type);
    } catch (e) {
      /* ignore */
    }

    if (options.selectedFilter.value !== "notificaciones") {
      unreadCount.value = (unreadCount.value || 0) + 1;
    }

    try {
      if (
        typeof serverNotificationTotalPages.value !== "undefined" &&
        serverNotificationTotalPages.value != null &&
        typeof options.selectedFilter.value !== "undefined" &&
        options.selectedFilter.value === "notificaciones"
      ) {
        void loadNotificationsFromServer(1);
      }
    } catch (e) {
      /* ignore */
    }
  }

  async function loadNotificationsFromServer(page = 1) {
    try {
      const params: {
        page: number;
        pageSize: number;
        startDate?: string;
        endDate?: string;
      } = { page, pageSize: notificationPageSize };
      if (isTodayOnly.value) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        params.startDate = start.toISOString();
        params.endDate = new Date().toISOString();
      } else {
        if (notificationFrom.value) {
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
      const evs = (resp.events || []) as Array<{
        id?: number | string;
        type?: string;
        event?: string;
        machine_id?: string | number;
        machineId?: string | number;
        machine_name?: string;
        machineName?: string;
        location?: string;
        timestamp?: string;
        ts?: string;
        data?: { cantidad?: number; reason?: string };
        amount?: number;
      }>;
      const mapped: DashboardNotification[] = evs.map((ev) => {
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

      notifications.value = mapped.filter((n) =>
        options.shouldShowNotificationForMachine(String(n.machineId || ""))
      );
      serverNotificationTotalPages.value = resp.totalPages || 1;
      notificationPage.value = resp.page || page;

      try {
        const maxId = notifications.value.reduce(
          (mx, n) => Math.max(mx, Number(n.id) || 0),
          0
        );
        notificationCounter = Math.max(notificationCounter, maxId + 1);
      } catch (e) {
        /* ignore */
      }

      recalcUnreadCountFromLastSeen();
    } catch (e) {
      console.warn("No se pudieron obtener eventos del backend:", e);
    }
  }

  function restoreNotificationPreferences() {
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
  }

  async function initNotifications() {
    restoreNotificationPreferences();
    try {
      await loadNotificationsFromServer(notificationPage.value);
    } catch (e) {
      console.warn("No se pudieron obtener eventos del backend:", e);
    }
  }

  watch(
    [isTodayOnly, notificationFrom, notificationTo],
    () => {
      try {
        localStorage.setItem("notifications_today", String(isTodayOnly.value));
        if (notificationFrom.value) {
          localStorage.setItem("notifications_from", notificationFrom.value);
        } else {
          localStorage.removeItem("notifications_from");
        }
        if (notificationTo.value) {
          localStorage.setItem("notifications_to", notificationTo.value);
        } else {
          localStorage.removeItem("notifications_to");
        }
      } catch (e) {
        /* ignore */
      }
      notificationPage.value = 1;
      void loadNotificationsFromServer(1);
    },
    { immediate: false }
  );

  return {
    notifications,
    unreadCount,
    isTodayOnly,
    notificationFrom,
    notificationTo,
    notificationPage,
    notificationTotalPages,
    visibleNotifications,
    pagedNotifications,
    addDashboardNotification,
    loadNotificationsFromServer,
    markNotificationsSeen,
    initNotifications,
  };
}
