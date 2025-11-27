import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import DashboardView from "../views/DashboardView.vue";
import MachinesView from "../views/MachinesView.vue";
import MachineDetailView from "../views/MachineDetailView.vue";
import EmployeesView from "../views/EmployeesView.vue";
import LoginPage from "../views/LoginPage.vue";

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
    path: "/machines/:id",
    name: "machine-detail",
    component: MachineDetailView,
    meta: { requiresAuth: true },
    props: true,
  },
  {
    path: "/employees",
    name: "employees",
    component: EmployeesView,
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

router.beforeEach((to, from, next) => {
  const isAuth = localStorage.getItem("auth") === "true";
  if (to.meta.requiresAuth && !isAuth) {
    next({ name: "login" });
  } else if (to.name === "login" && isAuth) {
    next({ name: "dashboard" });
  } else {
    next();
  }
});

export default router;
