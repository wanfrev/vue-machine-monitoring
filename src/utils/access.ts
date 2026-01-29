export type UserRole = string;

export function getAssignedMachineIdsFromStorage(): string[] {
  // Prefer the array if present
  try {
    const raw = localStorage.getItem("assignedMachineIds");
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v));
      }
    }
  } catch {
    // ignore
  }

  // Fallback: single id
  try {
    const single = localStorage.getItem("assignedMachineId");
    return single ? [String(single)] : [];
  } catch {
    return [];
  }
}

export function canAccessMachine(params: {
  role: UserRole;
  assignedMachineIds: string[];
  machineId: string;
  machineStatus?: string | null;
}): boolean {
  const role = String(params.role || "");
  const machineId = String(params.machineId || "");
  const assigned = params.assignedMachineIds || [];

  if (!machineId) return false;
  if (role === "admin") return true;

  // In this app, role === 'employee' is used as Supervisor.
  // Supervisors: only assigned machines.
  if (role === "employee") {
    if (!assigned.length) return false;
    if (!assigned.includes(machineId)) return false;
    return true;
  }

  // Operators/employees (role === 'operator'): only assigned machines.
  if (role === "operator") {
    if (!assigned.length) return false;
    return assigned.includes(machineId);
  }

  // Default: keep existing behavior for other roles
  return true;
}

export function filterMachinesForRole<
  T extends { id: string; status?: string }
>(
  machines: T[],
  params: { role: UserRole; assignedMachineIds: string[] }
): T[] {
  const role = String(params.role || "");
  if (role === "admin") return machines;

  const assigned = params.assignedMachineIds || [];
  if (!assigned.length) {
    // For restricted roles, show nothing when nothing is assigned.
    if (role === "employee" || role === "operator") return [];
    return machines;
  }

  const set = new Set(assigned.map(String));
  const filtered = machines.filter((m) => set.has(String(m.id)));

  return filtered;
}
