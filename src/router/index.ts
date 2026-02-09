import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import DashboardView from "../views/DashboardView.vue";
import MachinesView from "../views/MachinesView.vue";
import EmployeesView from "../views/EmployeesView.vue";
import LoginPage from "../views/LoginPage.vue";
import MachineDetailLayout from "../views/MachineDetailLayout.vue";
import MachineResumenView from "../views/MachineResumenView.vue";
import MachineHistorialView from "../views/MachineHistorialView.vue";
import MachineEstadisticasView from "../views/MachineEstadisticasView.vue";
import ProfileView from "../views/ProfileView.vue";
import ReportsView from "../views/ReportsView.vue";
import ReportDetailView from "../views/ReportDetailView.vue";
import DailySalesView from "../views/DailySalesView.vue";
import FinanceView from "../views/FinanceView.vue";
import { isSupervisorJobRole } from "../utils/access";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/login",
    name: "login",
    component: LoginPage,
  },
  {
    path: "/",
    name: "dashboard",
    component: DashboardView,
    meta: { requiresAuth: true },
  },
  {
    path: "/machines",
    name: "machines",
    component: MachinesView,
    meta: { requiresAuth: true },
  },
  {
    path: "/reports",
    name: "reports",
    component: ReportsView,
    meta: { requiresAuth: true },
  },
  {
    path: "/reports/:reportId?",
    name: "report-detail",
    component: ReportDetailView,
    meta: { requiresAuth: true },
  },
  {
    path: "/finanzas",
    name: "finance",
    component: FinanceView,
    meta: { requiresAuth: true, requiresFinance: true },
  },
  {
    path: "/daily-sales",
    name: "daily-sales",
    component: DailySalesView,
    meta: { requiresAuth: true },
  },
  {
    path: "/machines/:id",
    component: MachineDetailLayout,
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
        component: MachineResumenView,
        props: true,
      },
      {
        path: "historial",
        name: "machine-historial",
        component: MachineHistorialView,
        props: true,
      },
      {
        path: "estadisticas",
        name: "machine-estadisticas",
        component: MachineEstadisticasView,
        props: true,
      },
    ],
  },
  {
    path: "/employees",
    name: "employees",
    component: EmployeesView,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: "/profile",
    name: "profile",
    component: ProfileView,
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
