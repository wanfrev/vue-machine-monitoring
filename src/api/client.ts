export async function updateUser(
  id: number,
  payload: {
    documentId: string;
    name: string;
    username: string;
    password?: string;
    jobRole: string;
    shift?: string;
    // Arreglo de IDs de máquinas asignadas
    assignedMachineIds?: string[];
    // Compatibilidad: un solo ID
    assignedMachineId?: string;
  }
) {
  const body: any = {
    name: payload.name,
    shift: payload.shift,
    document_id: payload.documentId,
    job_role: payload.jobRole,
  };
  const ids =
    payload.assignedMachineIds ??
    (payload.assignedMachineId ? [payload.assignedMachineId] : undefined);
  if (ids) {
    body.assigned_machine_ids = ids;
  }
  if (payload.password) {
    body.password = payload.password;
  }
  const res = await api.put(`/api/users/${id}`, body);
  return res.data;
}
import axios from "axios";

// Proyecto basado en Vue CLI (webpack), usar VUE_APP_* en lugar de import.meta.env
const baseURL = process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem("token", token);
    localStorage.setItem("auth", "true");
  } else {
    delete api.defaults.headers.common["Authorization"];
    localStorage.removeItem("token");
    localStorage.setItem("auth", "false");
  }
}

export async function login(username: string, password: string) {
  const res = await api.post("/api/auth/login", { username, password });
  const { token } = res.data;
  setAuthToken(token);
  return res.data;
}

export async function getMachines() {
  const res = await api.get("/api/machines");
  return res.data;
}
export async function createMachine(machine: {
  name: string;
  location: string;
  id?: string;
}) {
  const res = await api.post("/api/machines", machine);
  return res.data;
}

export async function updateMachine(
  id: string,
  machine: { name?: string; location?: string; status?: string }
) {
  const res = await api.put(`/api/machines/${id}`, machine);
  return res.data;
}

export async function deleteMachine(id: string) {
  await api.delete(`/api/machines/${id}`);
}

export async function getTotalCoins() {
  const res = await api.get("/api/machines/coins/total");
  return res.data as { totalCoins: number };
}

export async function getCoinsByMachine() {
  const res = await api.get("/api/machines/coins/by-machine");
  return res.data as { machine_id: string; total_coins: number }[];
}

// Historial de eventos/ingresos por máquina
export async function getMachineHistory(
  machineId: string,
  params: { startDate?: string; endDate?: string } = {}
) {
  const res = await api.get(`/api/machines/${machineId}/history`, {
    params,
  });
  return res.data as {
    kind: "Ingreso" | "Evento";
    description: string;
    date: string;
    time?: string;
    amount: number;
    ok: boolean;
  }[];
}

// Ingresos diarios por máquina (debe ser implementado en el backend)
export async function getMachineDailyIncome(
  machineId: string,
  params: { startDate?: string; endDate?: string } = {}
) {
  const res = await api.get(`/api/machines/${machineId}/income/daily`, {
    params,
  });
  return res.data as { date: string; income: number }[];
}

// Registro de encendido/apagado por máquina
export async function getMachinePowerLogs(
  machineId: string,
  params: { startDate?: string; endDate?: string } = {}
) {
  const res = await api.get(`/api/machines/${machineId}/power-logs`, {
    params,
  });
  return res.data as {
    event: "Encendido" | "Apagado";
    ts: string; // fecha y hora
    dur: number | null; // duración en minutos cuando aplique
  }[];
}

// Users / Employees
export async function getUsers() {
  const res = await api.get("/api/users");
  const data = res.data as any[];
  return data.map((u) => ({
    ...u,
    documentId: u.documentId ?? u.document_id ?? "",
    jobRole: u.jobRole ?? u.job_role ?? "",
    assignedMachineIds:
      u.assignedMachineIds ??
      u.assigned_machine_ids ??
      (u.assignedMachineId ? [u.assignedMachineId] : []),
  }));
}

export async function createUser(payload: {
  documentId: string;
  name: string;
  username: string;
  password: string;
  jobRole: string;
  shift?: string;
  assignedMachineIds?: string[];
  // Compatibilidad: un solo ID
  assignedMachineId?: string;
  role: "employee" | "admin";
}) {
  const ids =
    payload.assignedMachineIds ??
    (payload.assignedMachineId ? [payload.assignedMachineId] : undefined);
  const body = {
    username: payload.username,
    password: payload.password,
    name: payload.name,
    role: payload.role,
    shift: payload.shift,
    // Campos en snake_case para coincidir con la API/BD
    document_id: payload.documentId,
    job_role: payload.jobRole,
    ...(ids ? { assigned_machine_ids: ids } : {}),
  };
  const res = await api.post("/api/users", body);
  return res.data;
}

export async function deleteUser(id: string | number) {
  await api.delete(`/api/users/${id}`);
}
