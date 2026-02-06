import { ref, type Ref } from "vue";
import { getMachines, getMachineDailyIncome } from "@/api/client";
import {
  getMonthStartLocalStr,
  getTodayLocalStr,
  getWeekStartLocalStr,
} from "@/utils/date";

type MachineLike = {
  id: string;
};

type UseMachineDataOptions = {
  machines: Ref<MachineLike[]>;
  scopedMachines: Ref<MachineLike[]>;
  ensureUsageDataFresh: () => Promise<void>;
  onUnauthorized?: () => void;
};

export function useMachineData(options: UseMachineDataOptions) {
  const coinsByMachine = ref<Record<string, number>>({});
  const dailyCoinsByMachine = ref<Record<string, number>>({});
  const weeklyCoinsByMachine = ref<Record<string, number>>({});

  async function loadDashboardData() {
    try {
      options.machines.value = await getMachines();

      const visibleMachines = options.scopedMachines.value;
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
              const rows = (await getMachineDailyIncome(machine.id, {
                startDate: startLocalStr,
                endDate: todayLocalStr,
              })) as Array<{ date?: string; income?: number | string }>;

              let coinsMonth = 0;
              let coinsToday = 0;
              let coinsWeek = 0;
              if (Array.isArray(rows) && rows.length) {
                for (const r of rows) {
                  const dateStr = String(r?.date ?? "").slice(0, 10);
                  const inc = Number(r?.income ?? 0);
                  if (!Number.isFinite(inc)) continue;
                  if (
                    dateStr >= monthStartLocalStr &&
                    dateStr <= todayLocalStr
                  ) {
                    coinsMonth += inc;
                  }
                  if (dateStr === todayLocalStr) coinsToday = inc;
                  if (
                    dateStr >= weekStartLocalStr &&
                    dateStr <= todayLocalStr
                  ) {
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
        try {
          await options.ensureUsageDataFresh();
        } catch (e) {
          // ignore
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
        options.onUnauthorized?.();
      } else {
        console.error("Error al cargar máquinas:", err);
      }
    }
  }

  return {
    coinsByMachine,
    dailyCoinsByMachine,
    weeklyCoinsByMachine,
    loadDashboardData,
  };
}
