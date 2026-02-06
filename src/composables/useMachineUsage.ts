import { ref, type Ref } from "vue";
import { getMachinePowerLogs } from "@/api/client";
import { getTodayLocalStr } from "@/utils/date";

type MachineLike = {
  id: string;
};

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
