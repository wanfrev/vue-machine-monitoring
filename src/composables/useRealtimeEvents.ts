import { type Ref } from "vue";
import { getSocket } from "@/api/realtime";
import { getTodayLocalStr } from "@/utils/date";
import { type DashboardNotificationType } from "@/types/dashboard";

type MachineLike = {
  id: string;
  name?: string;
  location?: string;
  test_mode?: boolean;
  status?: string;
  last_on?: string | null;
  last_off?: string | null;
};

type SocketPayload = {
  machineId?: string | number;
  machine_id?: string | number;
  amount?: number;
  data?: { cantidad?: number; reason?: string };
  timestamp?: string;
  ts?: string;
  machineName?: string;
  location?: string;
  eventType?: string;
  type?: string;
};

type AddNotificationInput = {
  type: DashboardNotificationType;
  machineId: string;
  machineName?: string;
  location?: string;
  timestamp?: string;
  amount?: number;
  detail?: string;
};

type RealtimeOptions = {
  currentRole: Ref<string>;
  machines: Ref<MachineLike[]>;
  coinsByMachine: Ref<Record<string, number>>;
  dailyCoinsByMachine: Ref<Record<string, number>>;
  shouldShowNotificationForMachine: (machineId: string) => boolean;
  addDashboardNotification: (input: AddNotificationInput) => void;
  loadDashboardData: () => Promise<void>;
};

export function useRealtimeEvents(options: RealtimeOptions) {
  const audioCache = new Map<string, HTMLAudioElement>();

  function playSound(type: DashboardNotificationType) {
    let src = "/sounds/coin.mp3";
    if (type === "machine_on") src = "/sounds/on.mp3";
    if (type === "machine_off") src = "/sounds/off.mp3";
    let audio = audioCache.get(src);
    if (!audio) {
      audio = new Audio(src);
      audioCache.set(src, audio);
    }
    try {
      audio.currentTime = 0;
      void audio.play();
    } catch (e) {
      /* ignore */
    }
  }

  let coinSocket: ReturnType<typeof getSocket> | null = null;
  let coinHandler: ((payload: SocketPayload) => void) | null = null;
  let machineOnHandler: ((payload: SocketPayload) => void) | null = null;
  let machineOffHandler: ((payload: SocketPayload) => void) | null = null;
  let swMessageHandler: ((ev: MessageEvent) => void) | null = null;

  async function startRealtime() {
    try {
      coinSocket = getSocket();
      coinHandler = (payload: SocketPayload) => {
        const machineId = String(payload.machineId ?? payload.machine_id ?? "");
        const amount =
          Number(payload.amount ?? payload.data?.cantidad ?? 1) || 1;
        const ts = payload.timestamp || payload.ts || new Date().toISOString();

        if (
          !machineId ||
          !options.shouldShowNotificationForMachine(machineId)
        ) {
          return;
        }

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

        const machine = options.machines.value.find(
          (m) => String(m.id) === machineId
        );

        try {
          if (!machine?.test_mode) {
            options.coinsByMachine.value = {
              ...options.coinsByMachine.value,
              [machineId]:
                (options.coinsByMachine.value[machineId] || 0) + amount,
            };
            if (!eventLocalDate || eventLocalDate === todayLocalStr) {
              options.dailyCoinsByMachine.value = {
                ...options.dailyCoinsByMachine.value,
                [machineId]:
                  (options.dailyCoinsByMachine.value[machineId] || 0) + amount,
              };
            }
          }
        } catch (e) {
          // ignore
        }
      };
      coinSocket.on("coin_inserted", coinHandler);

      machineOnHandler = async (payload: SocketPayload) => {
        try {
          const machineId = String(
            payload.machineId ?? payload.machine_id ?? ""
          );
          const ts =
            payload.timestamp || payload.ts || new Date().toISOString();

          if (
            !machineId ||
            !options.shouldShowNotificationForMachine(machineId)
          ) {
            return;
          }

          const idx = options.machines.value.findIndex(
            (m) => String(m.id) === machineId
          );
          if (idx >= 0) {
            const updated = {
              ...options.machines.value[idx],
              status: "active",
              last_on: String(ts),
            };
            options.machines.value = options.machines.value.map((m, i) =>
              i === idx ? updated : m
            );
          } else {
            await options.loadDashboardData();
          }
          options.addDashboardNotification({
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
      machineOffHandler = async (payload: SocketPayload) => {
        try {
          const machineId = String(
            payload.machineId ?? payload.machine_id ?? ""
          );
          const ts =
            payload.timestamp || payload.ts || new Date().toISOString();

          if (
            !machineId ||
            !options.shouldShowNotificationForMachine(machineId)
          ) {
            return;
          }

          const idx = options.machines.value.findIndex(
            (m) => String(m.id) === machineId
          );
          if (idx >= 0) {
            const updated = {
              ...options.machines.value[idx],
              status: "inactive",
              last_off: String(ts),
            };
            options.machines.value = options.machines.value.map((m, i) =>
              i === idx ? updated : m
            );
          } else {
            await options.loadDashboardData();
          }
          options.addDashboardNotification({
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

    try {
      const pushModule = await import("@/services/push");
      pushModule.subscribeToPush().then((sub: unknown) => {
        if (sub) console.log("Push suscripción registrada");
      });
    } catch (e) {
      console.warn("No se pudo inicializar push subscription:", e);
    }

    try {
      if (
        navigator.serviceWorker &&
        "addEventListener" in navigator.serviceWorker
      ) {
        swMessageHandler = (ev: MessageEvent) => {
          try {
            const msg = ev.data;
            if (!msg) return;
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

              if (
                !machineId ||
                !options.shouldShowNotificationForMachine(machineId)
              ) {
                return;
              }

              if (eventType === "daily_report") {
                const shouldProcessFromSW =
                  typeof document === "undefined" ||
                  document.visibilityState !== "visible";
                if (shouldProcessFromSW) {
                  const employeeName = payload.employeeName || "Empleado";
                  const reportDate = payload.reportDate || "";
                  options.addDashboardNotification({
                    type: "daily_report",
                    machineId: "daily_report",
                    machineName: employeeName,
                    timestamp: String(ts),
                    detail: reportDate
                      ? `Reporte diario • ${reportDate}`
                      : "Reporte diario",
                  });
                  playSound("machine_on");
                }
                return;
              }
              if (eventType === "machine_on" || eventType === "machine_off") {
                const shouldProcessFromSW =
                  typeof document === "undefined" ||
                  document.visibilityState !== "visible";
                if (shouldProcessFromSW) {
                  options.addDashboardNotification({
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
  }

  function stopRealtime() {
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
        navigator.serviceWorker.removeEventListener(
          "message",
          swMessageHandler
        );
      } catch (e) {
        /* ignore */
      }
    }
  }

  return { startRealtime, stopRealtime };
}
