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

export function getNotificationCardClass(
  type: DashboardNotificationType,
  isDark: boolean
): string {
  if (type === "machine_on") {
    return isDark
      ? "border-emerald-600/40 bg-emerald-900/20"
      : "border-emerald-200 bg-emerald-50";
  }
  if (type === "machine_off") {
    return isDark
      ? "border-red-600/40 bg-red-900/20"
      : "border-red-200 bg-red-50";
  }
  if (type === "coin_inserted") {
    return isDark
      ? "border-amber-600/40 bg-amber-900/20"
      : "border-amber-200 bg-amber-50";
  }
  return isDark
    ? "border-zinc-800/70 bg-zinc-900/60"
    : "border-slate-200/70 bg-white/80";
}

export function getNotificationTitleTextClass(isDark: boolean): string {
  return isDark ? "text-zinc-100" : "text-slate-900";
}
