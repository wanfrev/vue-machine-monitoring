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
