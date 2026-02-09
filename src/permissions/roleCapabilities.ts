import type { RoleKind } from "@/utils/access";

export type RoleCapabilities = {
  canViewReports: boolean;
  canManageArea: boolean;
  canManageEmployees: boolean;
  canEditMachines: boolean;
  canEditMachineStatus: boolean;
  canEditCoinValues: boolean;
  canSeeFinance: boolean;
};

const ROLE_CAPABILITIES: Record<RoleKind, RoleCapabilities> = {
  admin: {
    canViewReports: true,
    canManageArea: true,
    canManageEmployees: true,
    canEditMachines: true,
    canEditMachineStatus: true,
    canEditCoinValues: true,
    canSeeFinance: true,
  },
  supervisor: {
    canViewReports: true,
    canManageArea: true,
    canManageEmployees: false,
    canEditMachines: false,
    canEditMachineStatus: false,
    canEditCoinValues: false,
    canSeeFinance: true,
  },
  operator: {
    canViewReports: false,
    canManageArea: false,
    canManageEmployees: false,
    canEditMachines: false,
    canEditMachineStatus: false,
    canEditCoinValues: false,
    canSeeFinance: false,
  },
};

export function getRoleCapabilities(kind: RoleKind): RoleCapabilities {
  return ROLE_CAPABILITIES[kind];
}
