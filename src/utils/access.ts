export type UserRole = string;
export type RoleKind = "admin" | "supervisor" | "operator";

export function isSupervisorJobRole(jobRole?: string | null): boolean {
  const jr = String(jobRole || "").toLowerCase();
  return jr.includes("supervisor");
}

export function resolveRoleKind(
  role?: string | null,
  jobRole?: string | null
): RoleKind {
  const safeRole = String(role || "");
  if (safeRole === "admin") return "admin";
  if (isSupervisorJobRole(jobRole)) return "supervisor";
  return "operator";
}

export function getRoleLabel(
  role?: string | null,
  jobRole?: string | null
): string {
  const kind = resolveRoleKind(role, jobRole);
  if (kind === "admin") return "Administrador";
  if (kind === "supervisor") return "Supervisor";
  const jr = String(jobRole || "").toLowerCase();
  if (jr.includes("operador")) return "Operador";
  if (String(role || "") === "employee") return "Empleado";
  return "Usuario";
}

export function canSeeManagement(kind: RoleKind): boolean {
  return kind === "admin" || kind === "supervisor";
}

export function canViewReports(kind: RoleKind): boolean {
  return kind === "admin" || kind === "supervisor";
}

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

  // Any non-admin user: only assigned machines.
  if (!assigned.length) return false;
  return assigned.includes(machineId);

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
    if (role === "employee") return [];
    return machines;
  }

  const set = new Set(assigned.map(String));
  const filtered = machines.filter((m) => set.has(String(m.id)));

  return filtered;
}
