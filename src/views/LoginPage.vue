<script setup lang="ts">
import { ref } from "vue";
import { login as apiLogin } from "../api/client";
import { useTheme } from "@/composables/useTheme";

const username = ref("");
const password = ref("");
const error = ref("");
const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;

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

      if (res.user.jobRole) {
        localStorage.setItem("jobRole", String(res.user.jobRole));
      } else {
        localStorage.removeItem("jobRole");
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
  <div class="login-shell" :class="isDark() ? 'is-dark' : 'is-light'">
    <div class="login-grid">
      <section class="login-right">
        <div class="login-right-overlay"></div>
        <div class="login-right-content">
          <div class="login-brand">
            <img
              src="/img/icons/K11BOX.webp"
              alt="MachineHub logo"
              class="h-16 w-16 rounded-full object-cover ring-1 ring-white/20"
            />
            <span class="text-sm font-semibold tracking-[0.2em] text-white">
              K11 BOX
            </span>
          </div>
          <div class="login-right-text">
            <p class="text-xs uppercase tracking-[0.3em] text-white/70">
              Monitor
            </p>
            <h2 class="mt-4 text-3xl font-semibold text-white">
              Control total de tu negocio en tiempo real.
            </h2>
            <p class="mt-3 text-sm text-white/70">
              Supervisa rendimiento, ingresos y actividad sin fricciones.
            </p>
          </div>
        </div>
      </section>

      <section class="login-left">
        <div class="login-inner">
          <div class="login-logo-row flex items-center gap-3">
            <img
              src="/img/icons/K11BOX.webp"
              alt="MachineHub logo"
              class="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200"
            />
            <span class="text-sm font-semibold text-slate-900">
              MachineHub
            </span>
          </div>

          <div class="mt-10">
            <h1 class="text-3xl font-extrabold tracking-tight text-slate-900">
              Bienvenido
            </h1>
            <p class="mt-2 text-sm text-slate-500">
              Ingresa tus credenciales para gestionar la flota.
            </p>
          </div>

          <form @submit.prevent="login" class="mt-8 space-y-5">
            <div>
              <label class="block text-xs font-semibold text-slate-700">
                Usuario
              </label>
              <input
                v-model="username"
                type="text"
                placeholder="Usuario"
                class="login-input mt-2 h-[52px] w-full rounded-lg border border-slate-200 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-100"
                autocomplete="username"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700">
                Contraseña
              </label>
              <input
                v-model="password"
                type="password"
                placeholder="••••••••"
                class="login-input mt-2 h-[52px] w-full rounded-lg border border-slate-200 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-100"
                autocomplete="current-password"
              />
            </div>

            <div v-if="error" class="text-red-500 text-sm text-left">
              {{ error }}
            </div>

            <div class="pt-2">
              <button
                type="submit"
                class="login-submit h-[52px] w-full rounded-lg text-sm font-semibold transition"
              >
                Iniciar sesión
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap");

.login-shell {
  min-height: 100vh;
  background: #0b0f14;
  font-family: "Manrope", "Plus Jakarta Sans", "Segoe UI", sans-serif;
}

.login-grid {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr;
}

.login-left {
  background: #ffffff;
  display: flex;
  justify-content: center;
  border-radius: 24px 24px 0 0;
  margin-top: -32px;
  box-shadow: 0 -24px 60px rgba(15, 23, 42, 0.18);
  position: relative;
  z-index: 1;
}

.login-shell.is-dark {
  background: #050608;
}

.login-shell.is-dark .login-left {
  background: #0b0f14;
  box-shadow: 0 -24px 60px rgba(0, 0, 0, 0.35);
}

.login-shell.is-dark .login-left h1,
.login-shell.is-dark .login-left span,
.login-shell.is-dark .login-left label {
  color: #e2e8f0;
}

.login-shell.is-dark .login-left p,
.login-shell.is-dark .login-left button:not(.login-submit),
.login-shell.is-dark .login-left .text-slate-500,
.login-shell.is-dark .login-left .text-slate-400 {
  color: rgba(226, 232, 240, 0.7);
}

.login-shell.is-dark .login-input {
  background: #101317;
  border-color: rgba(148, 163, 184, 0.25);
  color: #e2e8f0;
}

.login-shell.is-dark .login-input::placeholder {
  color: rgba(226, 232, 240, 0.4);
}

.login-shell.is-dark .login-input:focus {
  border-color: #cbd5f5;
  box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.2);
}

.login-inner {
  width: 100%;
  max-width: 520px;
  padding: 40px 24px 56px;
}

.login-right {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  min-height: 35vh;
  background: radial-gradient(
      circle at 20% 20%,
      rgba(148, 163, 184, 0.25),
      transparent 40%
    ),
    linear-gradient(135deg, #0b0f14 0%, #111318 45%, #1a1f26 100%);
  overflow: hidden;
}

.login-right-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(2, 6, 23, 0.25) 0%,
    rgba(2, 6, 23, 0.7) 100%
  );
}

.login-right-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
  max-width: 360px;
}

.login-submit {
  background: #0f172a;
  color: #ffffff;
}

.login-submit:hover {
  background: #0b1220;
}

.login-shell.is-dark .login-submit {
  background: #e2e8f0;
  color: #0b111a;
}

.login-shell.is-dark .login-submit:hover {
  background: #cbd5f5;
}

.login-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.login-right-text {
  display: none;
}

.login-logo-row {
  display: none;
}

@media (min-width: 1024px) {
  .login-grid {
    grid-template-columns: 1fr 1fr;
  }

  .login-left {
    justify-content: flex-start;
    margin-top: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .login-inner {
    padding: 96px 88px;
  }

  .login-right {
    align-items: flex-end;
    justify-content: flex-start;
    padding: 96px 88px;
    min-height: 100vh;
  }

  .login-brand {
    align-items: flex-start;
  }

  .login-right-content {
    align-items: flex-start;
    text-align: left;
  }

  .login-right-text {
    display: block;
  }

  .login-logo-row {
    display: flex;
  }
}
</style>
