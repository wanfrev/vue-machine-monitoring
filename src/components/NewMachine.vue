<script setup lang="ts">
import { ref, computed, defineEmits, defineProps, watch } from "vue";

const props = defineProps<{ open: boolean; count: number; dark?: boolean }>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "create", machine: { name: string; location: string }): void;
}>();

const location = ref("");
const name = computed(
  () => `Box-${(props.count + 1).toString().padStart(3, "0")}`
);
const isDark = computed(() => !!props.dark);
const id = ref(""); // Added line for machine ID

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
  if (!location.value.trim() || !name.value.trim()) return; // Updated condition
  emit("create", {
    name: name.value,
    location: location.value,
    id: id.value.trim() || undefined,
  }); // Added ID
  location.value = "";
  name.value = ""; // Reset name
  id.value = ""; // Reset ID
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
        class="w-full max-w-xl rounded-2xl border bg-white p-8 shadow-2xl"
        :class="
          isDark
            ? 'border-slate-800 bg-slate-900 text-slate-100'
            : 'border-slate-200 bg-white text-slate-700'
        "
        style="min-height: 480px"
      >
        <div class="flex items-center gap-3 mb-2">
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
              class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white text-2xl shadow-lg"
              >＋</span
            >
            <div>
              <h2 class="text-2xl font-bold text-slate-800">Nueva máquina</h2>
              <p class="text-base text-slate-400">
                Agrega una nueva máquina al sistema
              </p>
            </div>
          </div>
        </div>
        <form @submit.prevent="createMachine" class="space-y-5 mt-4">
          <div>
            <label class="block text-sm font-medium mb-1" for="machine-id"
              >ID de la máquina (opcional)</label
            >
            <input
              id="machine-id"
              v-model="id"
              type="text"
              class="w-full rounded-lg border px-3 py-2"
              :class="
                isDark
                  ? 'border-slate-700 bg-slate-800 text-white'
                  : 'border-slate-300 bg-white text-slate-900'
              "
              placeholder="Ejemplo: Maquina_Boxeo_02"
            />
          </div>
          <div>
            <label class="block text-base font-semibold mb-1"
              >Nombre de máquina<span class="text-red-500">*</span></label
            >
            <input
              type="text"
              :value="`Ej: Máquina Premium ${props.count + 1}`"
              readonly
              class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base bg-white text-slate-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="block text-base font-semibold mb-1"
              >Serial<span class="text-red-500">*</span></label
            >
            <input
              type="text"
              :value="`#${(props.count + 1).toString().padStart(3, '0')}`"
              readonly
              class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base bg-slate-100 text-slate-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="block text-base font-semibold mb-1"
              >Ubicación<span class="text-red-500">*</span></label
            >
            <input
              v-model="location"
              type="text"
              placeholder="Ej: Centro comercial - Pasillo D"
              class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base bg-white text-slate-700"
              required
            />
          </div>
          <div>
            <label class="block text-base font-semibold mb-1"
              >Tipo/Modelo<span class="text-red-500">*</span></label
            >
            <input
              type="text"
              placeholder=""
              class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base bg-white text-slate-700"
              required
            />
          </div>
          <div class="rounded-xl bg-red-50 px-4 py-3 text-red-500 text-base">
            <span class="font-semibold">Nota importante</span><br />
            La máquina se agregará con estado "Inactivo" y podrás editar sus
            datos después desde el panel de control.
          </div>
          <div class="flex gap-3 justify-end mt-6">
            <button
              type="button"
              class="rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-red-500 hover:bg-red-50 transition"
              @click="close"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-red-700"
            >
              <span class="text-xl">＋</span> Agregar máquina
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
