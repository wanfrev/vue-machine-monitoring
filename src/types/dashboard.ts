export type MachineStatus = "active" | "inactive" | "maintenance" | string;

export type Machine = {
  id: string;
  name: string;
  status: MachineStatus;
  location?: string;
  last_on?: string | null;
  last_off?: string | null;
  test_mode?: boolean;
  type?: string;
};

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
