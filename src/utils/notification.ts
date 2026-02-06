import type {
  DashboardNotification,
  DashboardNotificationType,
} from "@/types/dashboard";

export function getNotificationTitle(type: DashboardNotificationType): string {
  if (type === "machine_on") return "Máquina encendida";
  if (type === "machine_off") return "Máquina apagada";
  if (type === "coin_inserted") return "Moneda ingresada";
  return "Nuevo evento";
}

export function getNotificationDetailLine(
  notification: DashboardNotification
): string {
  if (notification.type === "coin_inserted") {
    const amount = Number(notification.amount ?? 1) || 1;
    return `+${amount} moneda(s)`;
  }
  return (notification.detail || "").trim();
}

export function getNotificationCardClass(isDark: boolean): string {
  return isDark
    ? "border-zinc-800/70 bg-zinc-900/60"
    : "border-slate-200/70 bg-white/80";
}

export function getNotificationDotClass(
  type: DashboardNotificationType,
  isDark: boolean
): string {
  if (type === "machine_on") return "bg-emerald-500";
  if (type === "machine_off") return "bg-red-500";
  if (type === "coin_inserted") return "bg-amber-400";
  return isDark ? "bg-zinc-500" : "bg-slate-400";
}

export function getNotificationTitleTextClass(isDark: boolean): string {
  return isDark ? "text-zinc-100" : "text-slate-900";
}
