<script setup lang="ts">
import { ref, computed, defineEmits, defineProps, watch } from "vue";
// import { getMachines } from "../api/client";

// (Eliminado: definición de tipo suelta que causa error de compilación)
const props = defineProps<{
  open: boolean;
  count: number;
  dark?: boolean;
  machines: { name: string }[];
}>();
const emit = defineEmits<{
  (e: "close"): void;
  (
    e: "create",
    machine: { name: string; location: string; type: string }
  ): void;
}>();

const location = ref("");
const type = ref("Boxeo");
const isDark = computed(() => !!props.dark);
// Usar la prop machines directamente

const name = computed(() => {
  // Buscar el mayor número usado para el tipo seleccionado
  const prefix = type.value;
  const regex = new RegExp(`^${prefix} (\\d+)$`);
  let maxNum = 0;
  for (const m of props.machines) {
    const match = m.name.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  // Formato con ceros a la izquierda
  const nextNum = (maxNum + 1).toString().padStart(2, "0");
  return `${prefix} ${nextNum}`;
});

// Prevent background scroll when modal is open
watch(
  () => props.open,
  (open) => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
  }
);

function close() {
  emit("close");
}

function createMachine() {
  if (!location.value.trim() || !name.value.trim() || !type.value.trim())
    return;
  emit("create", {
    name: name.value,
    location: location.value,
    type: type.value,
  });
  location.value = "";
  type.value = "Boxeo";
  close();
}
</script>

<template>
  <transition name="fade" appear>
    <div
      v-if="open"
      class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
      aria-hidden="true"
      @click="close"
    ></div>
  </transition>
  <transition name="modal" appear>
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      <div
        class="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl"
        :class="
          isDark
            ? 'border-slate-800 bg-slate-900 text-slate-100'
            : 'border-slate-200 bg-white text-slate-700'
        "
        style="min-height: 420px"
      >
        <div class="flex items-center gap-2 mb-2">
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition cursor-pointer"
            :class="
              isDark
                ? 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            "
            aria-label="Cerrar"
            @click="close"
          >
            ✕
          </button>
          <div class="flex items-center gap-2">
            <span
              class="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 text-white text-xl shadow-lg"
              >＋</span
            >
            <div>
              <h2 class="text-xl font-bold text-slate-800">Nueva máquina</h2>
              <p class="text-sm text-slate-400">
                Agrega una nueva máquina al sistema
              </p>
            </div>
          </div>
        </div>
        <form @submit.prevent="createMachine" class="space-y-4 mt-3">
          <!-- ID ahora es totalmente automático en el backend, no se pide aquí -->
          <div>
            <label class="block text-sm font-semibold mb-1"
              >Nombre de máquina<span class="text-red-500">*</span></label
            >
            <input
              type="text"
              :value="name"
              readonly
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white text-slate-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1"
              >Serial<span class="text-red-500">*</span></label
            >
            <input
              type="text"
              :value="`#${(props.count + 1).toString().padStart(3, '0')}`"
              readonly
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-100 text-slate-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1"
              >Ubicación<span class="text-red-500">*</span></label
            >
            <input
              v-model="location"
              type="text"
              placeholder="Ej: Centro comercial - Pasillo D"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white text-slate-700"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1"
              >Tipo/Modelo<span class="text-red-500">*</span></label
            >
            <select
              v-model="type"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white text-slate-700 cursor-pointer"
              required
            >
              <option value="Boxeo">Boxeo</option>
              <option value="Agilidad">Agilidad</option>
            </select>
          </div>
          <div class="rounded-xl bg-red-50 px-3 py-2 text-red-500 text-sm">
            <span class="font-semibold">Nota importante</span><br />
            La máquina se agregará con estado "Inactivo" y podrás editar sus
            datos después desde el panel de control.
          </div>
          <div class="flex gap-2 justify-end mt-4">
            <button
              type="button"
              class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 transition cursor-pointer"
              @click="close"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-red-700 cursor-pointer"
            >
              <span class="text-lg">＋</span> Agregar máquina
            </button>
          </div>
        </form>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 2, 0.3, 1), opacity 0.25s;
}
.modal-enter-from,
.modal-leave-to {
  transform: scale(0.95);
  opacity: 0;
}
</style>
