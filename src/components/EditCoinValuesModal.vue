<script setup lang="ts">
/* global defineProps, defineEmits */
import { computed, ref, watch } from "vue";
import {
  getCoinValues as apiGetCoinValues,
  setCoinValue as apiSetCoinValue,
} from "@/api/client";
import { useCoinValues } from "@/composables/useCoinValues";

const props = defineProps<{ open: boolean; dark: boolean }>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved"): void;
}>();

const isDark = computed(() => !!props.dark);

const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const ok = ref<string | null>(null);

const coinBoxeo = ref<number>(1);
const coinAgilidad = ref<number>(1);
const coinDefault = ref<number>(2);

const { refresh } = useCoinValues();

function getApiErrorMessage(e: unknown): string | null {
  const msg = (e as { response?: { data?: { message?: string } } })?.response
    ?.data?.message;
  return typeof msg === "string" && msg.trim() ? msg : null;
}

function syncFromMap(map: Record<string, number>) {
  coinBoxeo.value = Number(map.boxeo ?? 1);
  coinAgilidad.value = Number(map.agilidad ?? 1);
  coinDefault.value = Number(map.default ?? 2);
}

async function load() {
  loading.value = true;
  error.value = null;
  ok.value = null;
  try {
    const map = await apiGetCoinValues();
    syncFromMap(map || {});
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || "No se pudieron cargar los precios.";
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) void load();
    else {
      error.value = null;
      ok.value = null;
    }
  }
);

function close() {
  if (saving.value) return;
  emit("close");
}

function validate(): string | null {
  const b = Number(coinBoxeo.value);
  const a = Number(coinAgilidad.value);
  const d = Number(coinDefault.value);
  if (!Number.isFinite(b) || b <= 0) {
    return "Boxeo debe ser un número positivo.";
  }
  if (!Number.isFinite(a) || a <= 0)
    return "Agilidad debe ser un número positivo.";
  if (!Number.isFinite(d) || d <= 0)
    return "Otras debe ser un número positivo.";
  return null;
}

async function save() {
  error.value = null;
  ok.value = null;

  const validation = validate();
  if (validation) {
    error.value = validation;
    return;
  }

  saving.value = true;
  try {
    await apiSetCoinValue("boxeo", Number(coinBoxeo.value));
    await apiSetCoinValue("agilidad", Number(coinAgilidad.value));
    await apiSetCoinValue("default", Number(coinDefault.value));

    await refresh();

    ok.value = "Precios guardados.";
    emit("saved");

    window.setTimeout(() => {
      emit("close");
    }, 350);
  } catch (e: unknown) {
    error.value =
      getApiErrorMessage(e) || "No se pudieron guardar los precios.";
  } finally {
    saving.value = false;
    if (ok.value) {
      window.setTimeout(() => {
        ok.value = null;
      }, 2000);
    }
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
        class="w-full max-w-lg rounded-2xl border p-5 shadow-2xl backdrop-blur-xl"
        :class="
          isDark
            ? 'border-zinc-800/70 bg-zinc-950 text-zinc-100'
            : 'border-slate-200/70 bg-white text-slate-800'
        "
        role="dialog"
        aria-modal="true"
        aria-label="Editar precios"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="text-base font-semibold">Editar precios</h2>
            <p
              class="mt-0.5 text-xs"
              :class="isDark ? 'text-zinc-400' : 'text-slate-500'"
            >
              Valor por moneda según tipo de máquina
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
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label
                  class="block text-xs font-medium"
                  :class="isDark ? 'text-zinc-300' : 'text-slate-600'"
                  >Boxeo</label
                >
                <input
                  v-model.number="coinBoxeo"
                  type="number"
                  min="0"
                  step="0.1"
                  inputmode="decimal"
                  class="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none"
                  :class="
                    isDark
                      ? 'border-zinc-800/70 bg-zinc-950/20 text-zinc-100 placeholder:text-zinc-500 focus:ring-2 focus:ring-zinc-400/40'
                      : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/40'
                  "
                />
              </div>

              <div>
                <label
                  class="block text-xs font-medium"
                  :class="isDark ? 'text-zinc-300' : 'text-slate-600'"
                  >Agilidad</label
                >
                <input
                  v-model.number="coinAgilidad"
                  type="number"
                  min="0"
                  step="0.1"
                  inputmode="decimal"
                  class="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none"
                  :class="
                    isDark
                      ? 'border-zinc-800/70 bg-zinc-950/20 text-zinc-100 placeholder:text-zinc-500 focus:ring-2 focus:ring-zinc-400/40'
                      : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/40'
                  "
                />
              </div>

              <div>
                <label
                  class="block text-xs font-medium"
                  :class="isDark ? 'text-zinc-300' : 'text-slate-600'"
                  >Otras</label
                >
                <input
                  v-model.number="coinDefault"
                  type="number"
                  min="0"
                  step="0.1"
                  inputmode="decimal"
                  class="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none"
                  :class="
                    isDark
                      ? 'border-zinc-800/70 bg-zinc-950/20 text-zinc-100 placeholder:text-zinc-500 focus:ring-2 focus:ring-zinc-400/40'
                      : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/40'
                  "
                />
              </div>
            </div>

            <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
            <p
              v-else-if="ok"
              class="text-sm"
              :class="isDark ? 'text-emerald-300' : 'text-emerald-700'"
            >
              {{ ok }}
            </p>

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
                    : 'bg-slate-900 text-white hover:bg-slate-800'
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
