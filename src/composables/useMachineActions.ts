import { type Ref } from "vue";
import { createMachine, updateMachine } from "@/api/client";

type MachineLike = {
  id: string;
  name?: string;
  location?: string;
  status?: string;
  test_mode?: boolean;
  type?: string;
};

type CreateMachinePayload = {
  name: string;
  location: string;
  type?: string;
  id?: string;
};

type UpdateMachinePayload = {
  id: string;
  name?: string;
  location: string;
  type?: string;
};

type ToastType = "event" | "machine_on" | "machine_off" | "coin_inserted";

type UseMachineActionsOptions = {
  machines: Ref<MachineLike[]>;
  isAdmin: Ref<boolean>;
  statusMenuOpenId: Ref<string | null>;
  newMachineOpen: Ref<boolean>;
  newMachineMode: Ref<"create" | "edit">;
  machineToEdit: Ref<MachineLike | null>;
  loadDashboardData: () => Promise<void>;
  showToast: (
    title: string,
    body?: string,
    toastType?: ToastType,
    duration?: number
  ) => void;
};

export function useMachineActions(options: UseMachineActionsOptions) {
  function closeNewMachine() {
    options.newMachineOpen.value = false;
    options.newMachineMode.value = "create";
    options.machineToEdit.value = null;
  }

  async function handleNewMachine(machine: CreateMachinePayload) {
    try {
      await createMachine({
        name: machine.name,
        location: machine.location,
        type: machine.type,
        id: machine.id,
      });
      await options.loadDashboardData();
    } catch (err: unknown) {
      console.error("Error al crear máquina:", err);
    }
  }

  async function handleUpdateMachine(payload: UpdateMachinePayload) {
    try {
      const { id, name, location } = payload;
      const updatePayload: Partial<
        Pick<MachineLike, "name" | "location" | "type">
      > = {};
      if (
        location !== undefined &&
        location !== null &&
        String(location).trim() !== ""
      ) {
        updatePayload.location = String(location);
      }
      if (name !== undefined && name !== null && String(name).trim() !== "") {
        updatePayload.name = String(name);
      }
      if (
        payload.type !== undefined &&
        payload.type !== null &&
        String(payload.type).trim() !== ""
      ) {
        updatePayload.type = String(payload.type);
      }

      if (Object.keys(updatePayload).length === 0) {
        options.showToast(
          "Sin cambios",
          "No se detectaron campos modificados",
          "event",
          3000
        );
        return;
      }

      console.log("Updating machine", id, updatePayload);
      const resp = await updateMachine(id, updatePayload);
      console.log("updateMachine response", resp);

      try {
        await options.loadDashboardData();
        options.showToast(
          "Máquina actualizada",
          `Se guardaron los cambios en ${resp.name || id}`,
          "event",
          3000
        );
      } catch (e) {
        options.machines.value = options.machines.value.map((m) =>
          m.id === id ? { ...m, ...updatePayload } : m
        );
        options.showToast(
          "Máquina actualizada (cache)",
          "Se actualizaron los datos localmente.",
          "event",
          3000
        );
      }
    } catch (e) {
      console.error("Error actualizando máquina:", e);
      try {
        const err = e as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        const msg =
          err?.response?.data?.message || err?.message || "Error desconocido";
        options.showToast("Error al actualizar", String(msg), "event", 5000);
      } catch (ee) {
        options.showToast(
          "Error al actualizar",
          "Error desconocido",
          "event",
          5000
        );
      }
    } finally {
      closeNewMachine();
    }
  }

  function toggleStatusMenu(machineId: string) {
    if (!options.isAdmin.value) {
      alert("Solo un administrador puede cambiar el estado de la máquina.");
      return;
    }
    options.statusMenuOpenId.value =
      options.statusMenuOpenId.value === machineId ? null : machineId;
  }

  async function toggleMaintenance(machine: MachineLike) {
    if (!options.isAdmin.value) return;
    const newStatus =
      machine.status === "maintenance" ? "inactive" : "maintenance";
    try {
      await updateMachine(machine.id, { status: newStatus });
      options.machines.value = options.machines.value.map((m) =>
        m.id === machine.id ? { ...m, status: newStatus } : m
      );
    } catch (err) {
      console.error("Error actualizando estado de máquina:", err);
    } finally {
      options.statusMenuOpenId.value = null;
    }
  }

  async function toggleTestMode(machine: MachineLike) {
    if (!options.isAdmin.value) return;
    const newTest = machine.test_mode ? false : true;
    try {
      await updateMachine(machine.id, { test_mode: newTest });
      options.machines.value = options.machines.value.map((m) =>
        m.id === machine.id ? { ...m, test_mode: newTest } : m
      );
    } catch (err) {
      console.error("Error actualizando modo prueba de máquina:", err);
    } finally {
      options.statusMenuOpenId.value = null;
    }
  }

  return {
    closeNewMachine,
    handleNewMachine,
    handleUpdateMachine,
    toggleStatusMenu,
    toggleMaintenance,
    toggleTestMode,
  };
}
