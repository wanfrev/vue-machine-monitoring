<script setup lang="ts">
/* global defineProps, defineEmits */
import { computed, ref, watch } from "vue";
import {
  getExchangeRate as apiGetExchangeRate,
  updateExchangeRate as apiUpdateExchangeRate,
} from "@/api/client";

const props = defineProps<{ open: boolean; dark: boolean }>();
const emit = defineEmits<{ (e: "close"): void; (e: "saved"): void }>();

const isDark = computed(() => !!props.dark);

const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const ok = ref<string | null>(null);
const rate = ref<number>(0);

function getApiErrorMessage(e: unknown): string | null {
  const msg = (e as { response?: { data?: { message?: string } } })?.response
    ?.data?.message;
  return typeof msg === "string" && msg.trim() ? msg : null;
}

async function load() {
  loading.value = true;
  error.value = null;
  ok.value = null;
  try {
    const data = await apiGetExchangeRate();
    rate.value = Number(data.rate || 0);
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || "No se pudo cargar la tasa.";
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

async function save() {
  error.value = null;
  ok.value = null;
  const n = Number(rate.value);
  if (!Number.isFinite(n) || n <= 0) {
    error.value = "La tasa debe ser un número positivo.";
    return;
  }
  saving.value = true;
  try {
    await apiUpdateExchangeRate(n);
    ok.value = "Tasa guardada.";
    emit("saved");
    window.setTimeout(() => emit("close"), 300);
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || "No se pudo guardar la tasa.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <transition name="fade" appear>
    <div
      v-show="open"
      class="fixed inset-0 z-70 bg-black/50"
      aria-hidden="true"
      @click="close"
    ></div>
  </transition>
  <transition name="slide-up" appear>
    <div
      v-show="open"
      class="fixed inset-0 z-80 flex items-end justify-center p-4 sm:items-center"
    >
      <div
        class="w-full max-w-md rounded-2xl border p-5 shadow-2xl backdrop-blur-xl"
        :class="
          isDark
            ? 'border-zinc-800/70 bg-zinc-950 text-zinc-100'
            : 'border-slate-200/70 bg-white text-slate-800'
        "
      >
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-base font-semibold">Editar tasa</h2>
            <p
              class="mt-0.5 text-xs"
              :class="isDark ? 'text-zinc-400' : 'text-slate-500'"
            >
              Tasa de conversion VES a USD
            </p>
          </div>
          <button
            type="button"
            class="text-sm"
            :disabled="saving"
            @click="close"
          >
            ✕
          </button>
        </div>

        <div class="mt-4">
          <p v-if="loading" class="text-sm">Cargando...</p>
          <template v-else>
            <label class="block text-xs font-medium mb-1"
              >Tasa actual (VES)</label
            >
            <input
              v-model.number="rate"
              type="number"
              min="0"
              step="0.0001"
              class="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none"
              :class="
                isDark
                  ? 'border-zinc-800/70 bg-zinc-950/20 text-zinc-100'
                  : 'border-slate-200 bg-white text-slate-800'
              "
            />
            <p v-if="error" class="mt-2 text-sm text-red-400">{{ error }}</p>
            <p
              v-else-if="ok"
              class="mt-2 text-sm"
              :class="isDark ? 'text-emerald-300' : 'text-emerald-700'"
            >
              {{ ok }}
            </p>
          </template>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-xl border px-4 py-2 text-sm"
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
            {{ saving ? "Guardando..." : "Guardar" }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
