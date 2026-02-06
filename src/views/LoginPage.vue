<script setup lang="ts">
import { ref } from "vue";
import { login as apiLogin } from "../api/client";

const username = ref("");
const password = ref("");
const error = ref("");

async function login() {
  error.value = "";
  if (!username.value || !password.value) {
    error.value = "Por favor ingresa usuario y contraseña.";
    return;
  }
  try {
    const res = await apiLogin(username.value, password.value);
    // Guardar datos básicos del usuario en localStorage
    if (res && res.user) {
      if (res.user.role) {
        localStorage.setItem("role", res.user.role);
      }

      if (res.user.username) {
        localStorage.setItem("username", res.user.username);
      }

      if (res.user.name || res.user.username) {
        localStorage.setItem("userName", res.user.name || res.user.username);
      }

      // Máquinas asignadas
      const assignedIds =
        res.user.assignedMachineIds ?? res.user.assigned_machine_ids;
      const primaryId =
        res.user.assignedMachineId ??
        res.user.assigned_machine_id ??
        (Array.isArray(assignedIds) && assignedIds.length
          ? assignedIds[0]
          : null);

      // Guardar arreglo completo (como JSON) y, por compatibilidad, un ID único
      if (Array.isArray(assignedIds) && assignedIds.length) {
        localStorage.setItem("assignedMachineIds", JSON.stringify(assignedIds));
      } else {
        localStorage.removeItem("assignedMachineIds");
      }

      if (primaryId) {
        localStorage.setItem("assignedMachineId", String(primaryId));
      } else {
        localStorage.removeItem("assignedMachineId");
      }
    }
    window.location.href = "/";
  } catch (e: unknown) {
    const respMsg = (e as { response?: { data?: { message?: string } } })
      ?.response?.data?.message;
    error.value = respMsg || "Credenciales inválidas.";
  }
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-r from-sky-400 via-slate-100 to-slate-50"
  >
    <div
      class="backdrop-blur-xl bg-white/60 border border-slate-200 rounded-2xl shadow-2xl p-8 w-full max-w-md flex flex-col items-center"
    >
      <div class="flex flex-col items-center mb-6">
        <div class="mb-3">
          <div
            class="mx-auto h-20 w-20 sm:h-20 sm:w-20 rounded-full flex items-center justify-center"
          >
            <img
              src="/img/icons/K11BOX.webp"
              alt="MachineHub logo"
              class="h-full w-full object-cover rounded-full shadow-lg"
            />
          </div>
        </div>
        <h1 class="text-3xl font-bold text-slate-800 mb-1">MachineHub</h1>
        <p class="text-base text-slate-500 mb-2 text-center">
          Gestión inteligente de máquinas de golpes
        </p>
      </div>
      <div class="w-full max-w-md">
        <h2 class="text-xl font-bold mb-4 text-slate-800">Iniciar sesión</h2>
        <form @submit.prevent="login" class="space-y-5">
          <div>
            <label class="block text-sm font-medium mb-1 text-slate-700"
              >Usuario</label
            >
            <input
              v-model="username"
              type="text"
              placeholder="Usuario"
              class="w-full rounded-xl border px-4 py-3 text-base bg-white/80 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 placeholder:text-slate-400 shadow"
              autocomplete="username"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1 text-slate-700"
              >Contraseña</label
            >
            <input
              v-model="password"
              type="password"
              placeholder="••••••••"
              class="w-full rounded-xl border px-4 py-3 text-base bg-white/80 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 placeholder:text-slate-400 shadow"
              autocomplete="current-password"
            />
          </div>
          <div v-if="error" class="text-red-500 text-sm text-center">
            {{ error }}
          </div>
          <button
            type="submit"
            class="w-full rounded-xl bg-sky-600 text-white font-semibold py-3 mt-2 shadow-lg transition hover:bg-sky-700"
          >
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
