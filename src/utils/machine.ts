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
};

export function getCoinValueForMachine(
  machineName: string,
  machineType?: string | null
): number {
  const typeKey = String(machineType || "")
    .trim()
    .toLowerCase();
  if (typeKey && COIN_VALUE_BY_TYPE[typeKey] !== undefined) {
    return COIN_VALUE_BY_TYPE[typeKey];
  }
  return machineName.includes("Boxeo") ? 1 : 2;
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
