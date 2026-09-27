<script setup lang="ts">
import { ref } from "vue";
import { login as apiLogin } from "../api/client";

const username = ref("");
const password = ref("");
const error = ref("");
const submitting = ref(false);

async function login() {
  error.value = "";
  if (!username.value || !password.value) {
    error.value = "Por favor ingresa usuario y contraseña.";
    return;
  }
  submitting.value = true;
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

      const operatorRemaining = Number(res.user.operatorCoinBalance);
      if (Number.isFinite(operatorRemaining) && operatorRemaining >= 0) {
        localStorage.setItem(
          "operatorRemainingCoins",
          String(Math.trunc(operatorRemaining))
        );
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
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="login-shell">
    <div class="login-glow"></div>
    <div class="login-ropes" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>

    <main class="login-card">
      <div class="login-brand">
        <img src="/img/icons/K11BOX.webp" alt="K11 Box" class="login-logo" />
        <span class="login-wordmark">K11 BOX</span>
        <span class="login-underline"></span>
      </div>

      <h1 class="login-title">Bienvenido</h1>
      <p class="login-subtitle">Ingresa tus credenciales para continuar.</p>

      <form @submit.prevent="login" class="login-form">
        <div>
          <label class="login-label">Usuario</label>
          <input
            v-model="username"
            type="text"
            placeholder="Usuario"
            class="login-input"
            autocomplete="username"
          />
        </div>
        <div>
          <label class="login-label">Contraseña</label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            class="login-input"
            autocomplete="current-password"
          />
        </div>

        <p v-if="error" class="login-error">{{ error }}</p>

        <button type="submit" class="login-submit" :disabled="submitting">
          {{ submitting ? "Entrando…" : "Iniciar sesión" }}
        </button>
      </form>
    </main>

    <p class="login-footer">K11 Box · Boxeo &amp; Agilidad</p>
  </div>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap");

.login-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background: #060505;
  font-family: "Manrope", "Segoe UI", sans-serif;
}

.login-glow {
  position: absolute;
  top: -20%;
  left: 50%;
  transform: translateX(-50%);
  width: 720px;
  height: 720px;
  max-width: 160vw;
  background: radial-gradient(
    circle,
    rgba(220, 38, 38, 0.28) 0%,
    rgba(220, 38, 38, 0.08) 35%,
    transparent 65%
  );
  pointer-events: none;
}

.login-ropes {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.5;
}

.login-ropes span {
  position: absolute;
  left: -10%;
  right: -10%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(245, 158, 11, 0.35),
    transparent
  );
}

.login-ropes span:nth-child(1) {
  top: 18%;
}
.login-ropes span:nth-child(2) {
  top: 46%;
}
.login-ropes span:nth-child(3) {
  top: 74%;
}

.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
  background: #0d0c0c;
  border: 1px solid rgba(245, 158, 11, 0.15);
  border-top: 3px solid #dc2626;
  border-radius: 20px;
  padding: 40px 28px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
}

.login-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.login-logo {
  height: 64px;
  width: 64px;
  border-radius: 9999px;
  object-fit: cover;
  border: 2px solid rgba(220, 38, 38, 0.6);
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.12);
}

.login-wordmark {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.3em;
  color: #f5f5f4;
}

.login-underline {
  width: 36px;
  height: 3px;
  border-radius: 9999px;
  background: linear-gradient(90deg, #dc2626, #f59e0b);
}

.login-title {
  margin-top: 24px;
  font-size: 26px;
  font-weight: 800;
  color: #ffffff;
  text-align: center;
}

.login-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #a1a1aa;
  text-align: center;
}

.login-form {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.login-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #a1a1aa;
  margin-bottom: 6px;
}

.login-input {
  width: 100%;
  height: 50px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #171615;
  padding: 0 16px;
  font-size: 15px;
  color: #f4f4f5;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.login-input::placeholder {
  color: #71717a;
}

.login-input:focus {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.25);
}

.login-error {
  margin: 0;
  font-size: 13px;
  color: #f87171;
  text-align: left;
}

.login-submit {
  margin-top: 4px;
  height: 50px;
  border-radius: 12px;
  border: none;
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  transition: filter 0.15s ease, opacity 0.15s ease;
  cursor: pointer;
}

.login-submit:hover:not(:disabled) {
  filter: brightness(1.08);
}

.login-submit:disabled {
  opacity: 0.7;
  cursor: default;
}

.login-footer {
  position: relative;
  z-index: 1;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #52525b;
}
</style>
