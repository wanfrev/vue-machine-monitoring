<script setup lang="ts">
/* global defineProps, defineEmits */
import { computed, ref, watch } from "vue";
import { getMe as apiGetMe, updateMe as apiUpdateMe } from "@/api/client";

const props = defineProps<{ open: boolean; dark: boolean }>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "updated", payload: { name: string; username: string }): void;
}>();

const isDark = computed(() => !!props.dark);

const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);

const name = ref("");
const username = ref("");

function getApiErrorMessage(e: unknown): string | null {
  const msg = (e as { response?: { data?: { message?: string } } })?.response
    ?.data?.message;
  return typeof msg === "string" && msg.trim() ? msg : null;
}

async function loadProfile() {
  loading.value = true;
  error.value = null;
  try {
    const me = await apiGetMe();
    name.value = String(me?.name ?? "");
    username.value = String(me?.username ?? "");
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || "No se pudo cargar tu perfil.";
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      void loadProfile();
    } else {
      error.value = null;
    }
  }
);

function close() {
  if (saving.value) return;
  emit("close");
}

async function save() {
  error.value = null;
  const nextName = name.value.trim();
  const nextUsername = username.value.trim();

  if (nextName.length < 2) {
    error.value = "El nombre es muy corto.";
    return;
  }
  if (nextUsername.length < 3) {
    error.value = "El usuario debe tener al menos 3 caracteres.";
    return;
  }

  saving.value = true;
  try {
    const updated = await apiUpdateMe({
      name: nextName,
      username: nextUsername,
    });

    localStorage.setItem("userName", updated?.name || updated?.username);
    if (updated?.username) localStorage.setItem("username", updated.username);

    emit("updated", {
      name: String(updated?.name ?? nextName),
      username: String(updated?.username ?? nextUsername),
    });
    emit("close");
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || "No se pudo guardar.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <transition name="fade" appear>
    <div
      v-show="open"
      class="fixed inset-0 z-[70] bg-black/50"
      aria-hidden="true"
      @click="close"
    ></div>
  </transition>

  <transition name="slide-up" appear>
    <div
      v-show="open"
      class="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
    >
      <div
        class="w-full max-w-md rounded-2xl border p-5 shadow-2xl backdrop-blur-xl"
        :class="
          isDark
            ? 'border-zinc-800/70 bg-zinc-950 text-zinc-100'
            : 'border-slate-200/70 bg-white text-slate-800'
        "
        role="dialog"
        aria-modal="true"
        aria-label="Editar perfil"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="text-base font-semibold">Editar perfil</h2>
            <p
              class="mt-0.5 text-xs"
              :class="isDark ? 'text-zinc-400' : 'text-slate-500'"
            >
              Cambia tu nombre y usuario
            </p>
          </div>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm"
            :class="
              isDark
                ? 'border-zinc-800/70 bg-zinc-950/20 text-zinc-200 hover:bg-zinc-100/10'
                : 'border-slate-200/70 bg-white/50 text-slate-700 hover:bg-slate-50'
            "
            :disabled="saving"
            @click="close"
          >
            ✕
          </button>
        </div>

        <div class="mt-4 space-y-3">
          <div
            v-if="loading"
            class="text-sm"
            :class="isDark ? 'text-zinc-300' : 'text-slate-600'"
          >
            Cargando...
          </div>

          <template v-else>
            <div>
              <label
                class="block text-xs font-medium"
                :class="isDark ? 'text-zinc-300' : 'text-slate-600'"
                >Nombre</label
              >
              <input
                v-model="name"
                type="text"
                class="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none"
                :class="
                  isDark
                    ? 'border-zinc-800/70 bg-zinc-950/20 text-zinc-100 placeholder:text-zinc-500 focus:ring-2 focus:ring-zinc-400/40'
                    : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/40'
                "
                autocomplete="name"
              />
            </div>

            <div>
              <label
                class="block text-xs font-medium"
                :class="isDark ? 'text-zinc-300' : 'text-slate-600'"
                >Usuario</label
              >
              <input
                v-model="username"
                type="text"
                class="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none"
                :class="
                  isDark
                    ? 'border-zinc-800/70 bg-zinc-950/20 text-zinc-100 placeholder:text-zinc-500 focus:ring-2 focus:ring-zinc-400/40'
                    : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/40'
                "
                autocomplete="username"
              />
            </div>

            <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

            <div class="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                class="rounded-xl border px-4 py-2 text-sm font-medium"
                :class="
                  isDark
                    ? 'border-zinc-800/70 bg-zinc-950/20 text-zinc-200 hover:bg-zinc-100/10'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                "
                :disabled="saving"
                @click="close"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="rounded-xl px-4 py-2 text-sm font-semibold"
                :class="
                  isDark
                    ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                    : 'bg-sky-600 text-white hover:bg-sky-700'
                "
                :disabled="saving"
                @click="save"
              >
                {{ saving ? "Guardando…" : "Guardar" }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.18s ease, opacity 0.18s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(10px);
  opacity: 0;
}
</style>
