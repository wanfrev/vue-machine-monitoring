export function machineStatusLabel(status: string): string {
  if (status === "active") return "Activa";
  if (status === "maintenance") return "Mantenimiento";
  return "Inactiva";
}

export function machineStatusDotClass(status: string): string {
  if (status === "active") return "bg-emerald-500";
  if (status === "maintenance") return "bg-amber-400";
  return "bg-red-500";
}

const COIN_VALUE_BY_TYPE: Record<string, number> = {
  boxeo: 1,
  agilidad: 1,
};

let COIN_VALUES_OVERRIDE: Record<string, number> | null = null;

export function setCoinValuesByType(map: Record<string, number> | null) {
  COIN_VALUES_OVERRIDE = map;
}

export function getCoinValueForMachine(
  machineName: string,
  machineType?: string | null
): number {
  const typeKey = String(machineType || "")
    .trim()
    .toLowerCase();

  const lowerName = String(machineName || "").toLowerCase();
  const inferredKey = lowerName.includes("boxeo")
    ? "boxeo"
    : lowerName.includes("agilidad")
    ? "agilidad"
    : "";

  const effectiveKey = typeKey || inferredKey;

  if (COIN_VALUES_OVERRIDE) {
    if (effectiveKey && COIN_VALUES_OVERRIDE[effectiveKey] !== undefined) {
      return Number(COIN_VALUES_OVERRIDE[effectiveKey]);
    }
    if (COIN_VALUES_OVERRIDE.default !== undefined) {
      return Number(COIN_VALUES_OVERRIDE.default);
    }
  }

  if (effectiveKey && COIN_VALUE_BY_TYPE[effectiveKey] !== undefined) {
    return COIN_VALUE_BY_TYPE[effectiveKey];
  }
  if (lowerName.includes("boxeo") || lowerName.includes("agilidad")) return 1;
  return 2;
}

export function getIncomeFromCoins(
  coins: number,
  machineName: string,
  machineType?: string | null
): number {
  return coins * getCoinValueForMachine(machineName, machineType);
}

export function normalizeMachineName(name?: string | null): string {
  if (!name) return "—";
  let clean = String(name);
  clean = clean.replace(/^M(á|a)quina\s+/i, "").trim();
  clean = clean.replace(/^M(á|a)quina[_\s]*/i, "");
  clean = clean.replace(/_/g, " ");
  clean = clean.trim();
  return clean || String(name);
}
