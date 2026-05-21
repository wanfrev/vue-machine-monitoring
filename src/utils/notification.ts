import type {
  DashboardNotification,
  DashboardNotificationType,
} from "@/types/dashboard";

export function getNotificationTitle(type: DashboardNotificationType): string {
  if (type === "machine_on") return "Máquina encendida";
  if (type === "machine_off") return "Máquina apagada";
  return "Nuevo evento";
}

export function getNotificationDetailLine(
  notification: DashboardNotification
): string {
  return (notification.detail || "").trim();
}

export function getNotificationCardClass(
  type: DashboardNotificationType,
  isDark: boolean
): string {
  if (type === "machine_on") {
    return isDark
      ? "border-emerald-500/30 bg-emerald-500/10"
      : "border-emerald-200 bg-emerald-50/80";
  }
  if (type === "machine_off") {
    return isDark
      ? "border-rose-500/30 bg-rose-500/10"
      : "border-rose-200 bg-rose-50/80";
  }
  return isDark
    ? "border-zinc-800/70 bg-zinc-900/60"
    : "border-slate-200/70 bg-white/80";
}

export function getNotificationTitleTextClass(isDark: boolean): string {
  return isDark ? "text-zinc-100" : "text-slate-900";
}
