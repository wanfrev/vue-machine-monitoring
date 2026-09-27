import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import { isSupervisorJobRole } from "../utils/access";

function isPrivilegedUser(): boolean {
  const role = localStorage.getItem("role") || "";
  const jobRole = localStorage.getItem("jobRole") || "";
  return role === "admin" || isSupervisorJobRole(jobRole);
}

// Admin y supervisor no usan estas pantallas: sus datos viven en Máquinas y Equipo.
const redirectPrivilegedTo =
  (name: string) =>
  (_to: unknown, _from: unknown, next: (arg?: { name: string }) => void) =>
    isPrivilegedUser() ? next({ name }) : next();

// Las vistas se cargan de forma diferida (lazy) para que el primer arranque
// descargue y procese solo lo necesario, no toda la aplicación.
const routes: Array<RouteRecordRaw> = [
  {
    path: "/login",
    name: "login",
    component: () => import("../views/LoginPage.vue"),
  },
  {
    path: "/",
    name: "dashboard",
    component: () => import("../views/DashboardView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/machines",
    name: "machines",
    component: () => import("../views/MachinesView.vue"),
    meta: { requiresAuth: true },
    beforeEnter: redirectPrivilegedTo("dashboard"),
  },
  {
    path: "/reports",
    name: "reports",
    component: () => import("../views/ReportsView.vue"),
    meta: { requiresAuth: true },
    beforeEnter: redirectPrivilegedTo("employees"),
  },
  {
    path: "/reports-historial",
    name: "reports-historial",
    component: () => import("../views/OperatorReportsHistoryView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/reports-daily",
    name: "reports-daily",
    component: () => import("../views/ReportsDailyView.vue"),
    meta: { requiresAuth: true },
    beforeEnter: redirectPrivilegedTo("employees"),
  },
  {
    path: "/reports/employee/:employeeId",
    name: "employee-report-detail",
    component: () => import("../views/EmployeeReportDetailView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/reports/:reportId?",
    name: "report-detail",
    component: () => import("../views/ReportDetailView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/finanzas",
    name: "finance",
    component: () => import("../views/FinanceView.vue"),
    meta: { requiresAuth: true, requiresFinance: true },
  },
  {
    path: "/machines/:id",
    component: () => import("../views/MachineDetailLayout.vue"),
    meta: { requiresAuth: true },
    props: true,
    children: [
      {
        path: "",
        redirect: { name: "machine-resumen" },
      },
      {
        path: "resumen",
        name: "machine-resumen",
        component: () => import("../views/MachineResumenView.vue"),
        props: true,
      },
    ],
  },
  {
    path: "/employees",
    name: "employees",
    component: () => import("../views/EmployeesView.vue"),
    meta: { requiresAuth: true, requiresManagement: true },
  },
  {
    path: "/profile",
    name: "profile",
    component: () => import("../views/ProfileView.vue"),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("token");
  const isAuth = !!token && localStorage.getItem("auth") === "true";
  if (to.meta.requiresAuth && !isAuth) {
    next({ name: "login" });
  } else if (to.meta.requiresFinance) {
    const role = localStorage.getItem("role") || "";
    const jobRole = localStorage.getItem("jobRole") || "";
    if (role !== "admin" && !isSupervisorJobRole(jobRole)) {
      next({ name: "dashboard" });
    } else {
      next();
    }
  } else if (to.meta.requiresManagement) {
    const role = localStorage.getItem("role") || "";
    const jobRole = localStorage.getItem("jobRole") || "";
    if (role !== "admin" && !isSupervisorJobRole(jobRole)) {
      next({ name: "dashboard" });
    } else {
      next();
    }
  } else if (to.meta.requiresAdmin) {
    const role = localStorage.getItem("role") || "";
    if (role !== "admin") {
      next({ name: "dashboard" });
    } else {
      next();
    }
  } else if (to.name === "login" && isAuth) {
    next({ name: "dashboard" });
  } else {
    next();
  }
});

export default router;
