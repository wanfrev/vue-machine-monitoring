export type { Machine, MachineStatus } from "@/types/machine";

export type DashboardFilters = {
  locations: string[];
};

export type DashboardNotificationType =
  | "machine_on"
  | "machine_off"
  | "coin_inserted"
  | "event";

export type DashboardNotification = {
  id: number;
  type: DashboardNotificationType;
  machineId: string;
  machineName?: string;
  location?: string;
  timestamp: string;
  amount?: number;
  detail?: string;
};

export type DashboardFilterKey =
  | "todas"
  | "activas"
  | "inactivas"
  | "mantenimiento"
  | "notificaciones";

export type ToastType = DashboardNotificationType | "event";
