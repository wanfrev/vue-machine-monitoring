import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import DashboardView from "../views/DashboardView.vue";
import MachinesView from "../views/MachinesView.vue";
import EmployeesView from "../views/EmployeesView.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "dashboard",
    component: DashboardView,
  },
  {
    path: "/machines",
    name: "machines",
    component: MachinesView,
  },
  {
    path: "/employees",
    name: "employees",
    component: EmployeesView,
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
