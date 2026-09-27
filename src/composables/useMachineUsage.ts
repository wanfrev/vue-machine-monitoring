import { ref, type Ref } from "vue";
import {
  getMachinePowerLogs,
  getAllMachinesPowerLogs,
  isBatchUnavailableError,
} from "@/api/client";
import { getTodayLocalStr } from "@/utils/date";

type MachineLike = {
  id: string;
};

type PowerLogs = Awaited<ReturnType<typeof getMachinePowerLogs>>;

// Encendidos/apagados de hoy de todas las máquinas en UNA petición. Devuelve null
// si el endpoint agregado no está disponible o falla en el servidor (modo antiguo
// por máquina, que ya se sabe que funciona).
async function fetchPowerLogsBatch(
  day: string
): Promise<Record<string, PowerLogs> | null> {
  try {
    return await getAllMachinesPowerLogs({ startDate: day, endDate: day });
  } catch (err) {
    if (isBatchUnavailableError(err)) {
      console.warn(
        "Endpoint agregado de encendidos no disponible, usando modo por máquina:",
        err
      );
      return null;
    }
    throw err;
  }
}

export function useMachineUsage(scopedMachines: Ref<MachineLike[]>) {
  const activeMinutesTodayByMachine = ref<Record<string, number>>({});
  const usageLoading = ref(false);
  const usageLastLoadedAt = ref<number | null>(null);
  const firstOnTodayByMachine = ref<Record<string, string>>({});

  async function ensureUsageDataFresh() {
    if (usageLoading.value) return;
    const last = usageLastLoadedAt.value;
    if (last && Date.now() - last < 60_000) return;

    usageLoading.value = true;
    try {
      const todayLocalStr = getTodayLocalStr();
      const batch = await fetchPowerLogsBatch(todayLocalStr);
      const map: Record<string, number> = {};
      const firstMap: Record<string, string> = {};
      await Promise.all(
        scopedMachines.value.map(async (machine) => {
          try {
            const logs = batch
              ? batch[machine.id] || []
              : await getMachinePowerLogs(machine.id, {
                  startDate: todayLocalStr,
                  endDate: todayLocalStr,
                });
            const activeMinutes = (logs || [])
              .filter((l) => l.event === "Encendido" && l.dur)
              .reduce((sum, l) => sum + Number(l.dur || 0), 0);
            map[machine.id] = activeMinutes;

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

  return {
    activeMinutesTodayByMachine,
    firstOnTodayByMachine,
    ensureUsageDataFresh,
  };
}
