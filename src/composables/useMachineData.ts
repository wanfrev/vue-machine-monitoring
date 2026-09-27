import { ref, type Ref } from "vue";
import {
  getMachines,
  getMachineDailyIncome,
  getAllMachinesDailyIncome,
  isBatchUnavailableError,
} from "@/api/client";
import {
  getMonthStartLocalStr,
  getTodayLocalStr,
  getWeekStartLocalStr,
} from "@/utils/date";

type MachineLike = {
  id: string;
};

type IncomeRow = { date?: string; income?: number | string };

type UseMachineDataOptions = {
  machines: Ref<MachineLike[]>;
  scopedMachines: Ref<MachineLike[]>;
  ensureUsageDataFresh: () => Promise<void>;
  onUnauthorized?: () => void;
};

// Suma las monedas de mes, semana y hoy a partir de las filas diarias de una máquina.
function summarizeIncome(
  rows: IncomeRow[],
  monthStartLocalStr: string,
  weekStartLocalStr: string,
  todayLocalStr: string
) {
  let month = 0;
  let today = 0;
  let week = 0;
  for (const r of rows) {
    const dateStr = String(r?.date ?? "").slice(0, 10);
    const inc = Number(r?.income ?? 0);
    if (!Number.isFinite(inc)) continue;
    if (dateStr >= monthStartLocalStr && dateStr <= todayLocalStr) {
      month += inc;
    }
    if (dateStr === todayLocalStr) today = inc;
    if (dateStr >= weekStartLocalStr && dateStr <= todayLocalStr) {
      week += inc;
    }
  }
  return { month, today, week };
}

// Ingresos diarios de todas las máquinas en UNA petición. Devuelve null si el
// endpoint agregado no está disponible o falla en el servidor: se usa entonces el
// modo antiguo (una petición por máquina), que ya se sabe que funciona.
async function fetchIncomeBatch(
  startDate: string,
  endDate: string
): Promise<Record<string, IncomeRow[]> | null> {
  try {
    const rows = await getAllMachinesDailyIncome({ startDate, endDate });
    const byMachine: Record<string, IncomeRow[]> = {};
    for (const row of Array.isArray(rows) ? rows : []) {
      const id = String(row.machineId);
      (byMachine[id] = byMachine[id] || []).push(row);
    }
    return byMachine;
  } catch (err) {
    if (isBatchUnavailableError(err)) {
      console.warn(
        "Endpoint agregado de ingresos no disponible, usando modo por máquina:",
        err
      );
      return null;
    }
    throw err;
  }
}

// Modo antiguo (una petición por máquina), solo como respaldo si el backend
// aún no fue actualizado.
async function fetchIncomePerMachine(
  machines: MachineLike[],
  startDate: string,
  endDate: string
): Promise<Record<string, IncomeRow[]>> {
  const byMachine: Record<string, IncomeRow[]> = {};
  await Promise.all(
    machines.map(async (machine) => {
      try {
        byMachine[machine.id] = (await getMachineDailyIncome(machine.id, {
          startDate,
          endDate,
        })) as IncomeRow[];
      } catch (err) {
        console.error(
          "Error obteniendo monedas del mes para máquina:",
          machine.id,
          err
        );
        byMachine[machine.id] = [];
      }
    })
  );
  return byMachine;
}

export function useMachineData(options: UseMachineDataOptions) {
  const coinsByMachine = ref<Record<string, number>>({});
  const dailyCoinsByMachine = ref<Record<string, number>>({});
  const weeklyCoinsByMachine = ref<Record<string, number>>({});

  async function refreshDashboardData() {
    try {
      const todayLocalStr = getTodayLocalStr();
      const monthStartLocalStr = getMonthStartLocalStr();
      const weekStartLocalStr = getWeekStartLocalStr();
      const startLocalStr =
        weekStartLocalStr < monthStartLocalStr
          ? weekStartLocalStr
          : monthStartLocalStr;

      // El endpoint agregado no depende de la lista de máquinas: se piden a la vez.
      const incomePromise = fetchIncomeBatch(startLocalStr, todayLocalStr);
      // Si getMachines falla primero nadie espera esta promesa; evitar el
      // "unhandled rejection" (el error real ya se maneja en el catch externo).
      incomePromise.catch(() => undefined);

      options.machines.value = await getMachines();

      const visibleMachines = options.scopedMachines.value;
      // Uso de hoy (encendidos/apagados) en paralelo con el cálculo de monedas.
      const usagePromise = options.ensureUsageDataFresh().catch(() => {
        // ignore
      });

      try {
        const rowsByMachine =
          (await incomePromise) ??
          (await fetchIncomePerMachine(
            visibleMachines,
            startLocalStr,
            todayLocalStr
          ));

        const monthMap: Record<string, number> = {};
        const dailyMap: Record<string, number> = {};
        const weekMap: Record<string, number> = {};
        for (const machine of visibleMachines) {
          const totals = summarizeIncome(
            rowsByMachine[machine.id] || [],
            monthStartLocalStr,
            weekStartLocalStr,
            todayLocalStr
          );
          monthMap[machine.id] = totals.month;
          dailyMap[machine.id] = totals.today;
          weekMap[machine.id] = totals.week;
        }

        coinsByMachine.value = monthMap;
        dailyCoinsByMachine.value = dailyMap;
        weeklyCoinsByMachine.value = weekMap;
      } catch (e) {
        // Un fallo puntual de red no debe poner los contadores en 0:
        // se conservan los últimos valores conocidos hasta el próximo refresco.
        console.error("Error obteniendo monedas del mes por máquina:", e);
      }

      await usagePromise;
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 401) {
        options.onUnauthorized?.();
      } else {
        console.error("Error al cargar máquinas:", err);
      }
    }
  }

  // Une llamadas simultáneas: si hay una carga en curso (p. ej. el refresco
  // periódico) y llega otra petición, se ejecuta UNA sola carga extra al terminar
  // la actual. Así no se acumulan cargas si el servidor va lento, y quien llama
  // (p. ej. tras cambiar el estado de una máquina) siempre recibe datos posteriores
  // a su cambio, nunca los de una consulta que ya estaba en vuelo.
  let current: Promise<void> | null = null;
  let trailing: Promise<void> | null = null;

  function loadDashboardData(): Promise<void> {
    if (!current) {
      current = refreshDashboardData().finally(() => {
        current = null;
      });
      return current;
    }
    if (!trailing) {
      trailing = current.then(() => {
        trailing = null;
        return loadDashboardData();
      });
    }
    return trailing;
  }

  return {
    coinsByMachine,
    dailyCoinsByMachine,
    weeklyCoinsByMachine,
    loadDashboardData,
  };
}
