import { computed, onScopeDispose, ref, watch } from "vue";
import { getInventorySummary, getMachines } from "@/api/client";

export type InventoryPeriod = "day" | "week" | "month" | "custom";

export type InventoryMachineRow = {
  machineId: string;
  machineName: string;
  machineLocation: string;
  availableCoins: number;
  soldCoins: number;
  returnedCoins: number;
  lostCoins: number;
  pagoMovil: number;
  dolares: number;
  bolivares: number;
  premio: number;
  totalReported: number;
  coinLossBolivares: number;
  total: number;
  totalUsdEquivalent: number;
  events: {
    record: number;
    premio: number;
    perdidas: number;
    devueltas: number;
  };
};

export type InventoryMachineOption = { id: string; name: string };

type InventoryMachineApiRow = { id: string; name?: string };

type InventorySummary = {
  availableCoins: number;
  soldCoins: number;
  returnedCoins: number;
  lostCoins: number;
  pagoMovil: number;
  dolares: number;
  bolivares: number;
  premio: number;
  totalReported: number;
  coinLossBolivares: number;
  total: number;
  totalUsdEquivalent: number;
  events: {
    record: number;
    premio: number;
    perdidas: number;
    devueltas: number;
  };
};

const DEFAULT_SUMMARY: InventorySummary = {
  availableCoins: 0,
  soldCoins: 0,
  returnedCoins: 0,
  lostCoins: 0,
  pagoMovil: 0,
  dolares: 0,
  bolivares: 0,
  premio: 0,
  totalReported: 0,
  coinLossBolivares: 0,
  total: 0,
  totalUsdEquivalent: 0,
  events: { record: 0, premio: 0, perdidas: 0, devueltas: 0 },
};

export function useInventory() {
  const period = ref<InventoryPeriod>("day");
  const machineId = ref<string>("");
  const date = ref<string>(new Date().toISOString().slice(0, 10));
  const month = ref<string>(new Date().toISOString().slice(0, 7));
  const startDate = ref<string>(new Date().toISOString().slice(0, 10));
  const endDate = ref<string>(new Date().toISOString().slice(0, 10));

  const machineOptions = ref<InventoryMachineOption[]>([]);
  const exchangeRate = ref(0);
  const rows = ref<InventoryMachineRow[]>([]);
  const summary = ref<InventorySummary>({ ...DEFAULT_SUMMARY });
  const appliedStart = ref<string | null>(null);
  const appliedEnd = ref<string | null>(null);
  const loading = ref(false);
  const error = ref("");

  const appliedRangeLabel = computed(() => {
    const a = appliedStart.value;
    const b = appliedEnd.value;
    if (!a || !b) return "";
    return a === b ? `Fecha aplicada: ${a}` : `Rango aplicado: ${a} · ${b}`;
  });

  const canLoad = computed(() => {
    if (period.value === "day" || period.value === "week") return !!date.value;
    if (period.value === "month") return !!month.value;
    return !!startDate.value && !!endDate.value;
  });

  function buildParams(): Parameters<typeof getInventorySummary>[0] | null {
    if (!canLoad.value) return null;
    const payload: Parameters<typeof getInventorySummary>[0] = {
      period: period.value,
    };
    if (machineId.value) payload.machineId = machineId.value;
    if (period.value === "day" || period.value === "week") {
      payload.date = date.value;
    }
    if (period.value === "month") {
      payload.month = month.value;
    }
    if (period.value === "custom") {
      payload.startDate = startDate.value;
      payload.endDate = endDate.value;
    }
    return payload;
  }

  async function loadMachineOptions() {
    const data = await getMachines();
    machineOptions.value = (
      Array.isArray(data) ? (data as InventoryMachineApiRow[]) : []
    ).map((machine) => ({
      id: String(machine.id),
      name: String(machine.name || machine.id),
    }));
  }

  let debounceTimer: number | undefined;
  let requestSeq = 0;

  async function fetchInventory() {
    const payload = buildParams();
    if (!payload) return;

    const currentSeq = ++requestSeq;
    loading.value = true;
    error.value = "";
    try {
      const data = await getInventorySummary(payload);
      if (currentSeq !== requestSeq) return;
      exchangeRate.value = Number(data.exchangeRate || 0);
      rows.value = data.machines || [];
      summary.value = data.summary || { ...DEFAULT_SUMMARY };
      appliedStart.value = data.filters?.startDate ?? null;
      appliedEnd.value = data.filters?.endDate ?? null;
    } catch (e: unknown) {
      if (currentSeq !== requestSeq) return;
      console.error("Error cargando inventario:", e);
      rows.value = [];
      summary.value = { ...DEFAULT_SUMMARY };
      const status = (e as { response?: { status?: number } })?.response
        ?.status;
      error.value =
        status === 404
          ? "El backend no tiene disponible /api/inventory. Reinicia el servidor backend y confirma que está usando la versión nueva."
          : "No se pudo cargar el inventario. Revisa la conexión o permisos.";
    } finally {
      if (currentSeq === requestSeq) {
        loading.value = false;
      }
    }
  }

  function loadInventory() {
    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
    void fetchInventory();
  }

  function scheduleInventoryReload() {
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      void fetchInventory();
    }, 180);
  }

  watch([period, machineId, date, month, startDate, endDate], () => {
    scheduleInventoryReload();
  });

  onScopeDispose(() => {
    if (debounceTimer) window.clearTimeout(debounceTimer);
  });

  return {
    period,
    machineId,
    date,
    month,
    startDate,
    endDate,
    machineOptions,
    exchangeRate,
    rows,
    summary,
    appliedStart,
    appliedEnd,
    loading,
    error,
    canLoad,
    appliedRangeLabel,
    loadMachineOptions,
    loadInventory,
  };
}
