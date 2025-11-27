<script setup lang="ts">
import { ref } from "vue";

const username = ref("");
const password = ref("");
const error = ref("");

function login() {
  if (!username.value || !password.value) {
    error.value = "Please enter username and password.";
    return;
  }
  // Simulate login (replace with real auth if needed)
  if (username.value === "admin" && password.value === "admin") {
    localStorage.setItem("auth", "true");
    window.location.href = "/";
  } else {
    error.value = "Invalid credentials.";
  }
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center"
    style="
      background: linear-gradient(
        to right,
        #fca5a5 0%,
        #f3f4f6 40%,
        #f8fafc 100%
      );
    "
  >
    <div
      class="backdrop-blur-xl bg-white/60 border border-slate-200 rounded-2xl shadow-2xl p-8 w-full max-w-md flex flex-col items-center"
      style="box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.18)"
    >
      <div class="flex flex-col items-center mb-6">
        <div class="mb-3">
          <div
            class="mx-auto h-12 w-12 rounded-xl flex items-center justify-center bg-red-600 shadow-lg"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 12h5l-1 5 6-8h-5l1-5-6 8z"
                stroke="#fff"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
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
              class="w-full rounded-xl border px-4 py-3 text-base bg-white/80 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 placeholder:text-slate-400 shadow"
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
              class="w-full rounded-xl border px-4 py-3 text-base bg-white/80 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 placeholder:text-slate-400 shadow"
              autocomplete="current-password"
            />
          </div>
          <div v-if="error" class="text-red-500 text-sm text-center">
            {{ error }}
          </div>
          <button
            type="submit"
            class="w-full rounded-xl bg-red-600 text-white font-semibold py-3 mt-2 shadow-lg transition hover:bg-red-700"
            style="box-shadow: 0 4px 24px 0 rgba(220, 38, 38, 0.15)"
          >
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
