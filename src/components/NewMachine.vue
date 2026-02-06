<script setup lang="ts">
import { ref, computed, defineEmits, defineProps, watch } from "vue";
// import { getMachines } from "../api/client";

// (Eliminado: definición de tipo suelta que causa error de compilación)
const props = defineProps<{
  open: boolean;
  count: number;
  dark?: boolean;
  machines: { name: string }[];
  mode?: "create" | "edit";
  machineToEdit?: {
    id: string;
    name: string;
    location?: string;
    type?: string;
  };
}>();
const emit = defineEmits<{
  (e: "close"): void;
  (
    e: "create",
    machine: { name: string; location: string; type?: string }
  ): void;
  (
    e: "update",
    machine: { id: string; name?: string; location: string; type?: string }
  ): void;
}>();

const location = ref("");
const type = ref("Boxeo");
const editableName = ref("");
const isDark = computed(() => !!props.dark);
// Usar la prop machines directamente

const name = computed(() => {
  // computed default name (used for creation)
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
  const nextNum = (maxNum + 1).toString().padStart(2, "0");
  return `${prefix} ${nextNum}`;
});

// Inicializar valores cuando se abre en modo edición
watch(
  () => props.open,
  (open) => {
    if (open && props.mode === "edit" && props.machineToEdit) {
      location.value = props.machineToEdit.location || "";
      editableName.value = props.machineToEdit.name || "";
      // If backend/client didn't include explicit `type`, infer from the name
      const inferredType = props.machineToEdit.type
        ? props.machineToEdit.type
        : props.machineToEdit.name &&
          props.machineToEdit.name.startsWith("Boxeo")
        ? "Boxeo"
        : "Agilidad";
      type.value = inferredType || type.value;
    }
    if (open && props.mode !== "edit") {
      location.value = "";
      type.value = "Boxeo";
      editableName.value = name.value;
    }
  }
);

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

function submit() {
  if (!location.value.trim()) return;

  if (props.mode === "edit" && props.machineToEdit) {
    const payload = {
      id: props.machineToEdit.id,
      name: editableName.value,
      location: location.value,
      type: type.value,
    };
    try {
      console.log("NewMachine emit update:", payload);
    } catch (e) {
      /* ignore */
    }
    emit("update", payload);
  } else {
    const payload = {
      name: editableName.value || name.value,
      location: location.value,
      type: type.value,
    };
    try {
      console.log("NewMachine emit create:", payload);
    } catch (e) {
      /* ignore */
    }
    emit("create", payload);
  }

  location.value = "";
  type.value = "Boxeo";
  editableName.value = "";
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
        class="w-full max-w-xl rounded-2xl border bg-white p-6 shadow-2xl"
        :class="
          isDark
            ? 'border-slate-800 bg-slate-900 text-slate-100'
            : 'border-slate-200 bg-white text-slate-700'
        "
        style="min-height: 380px"
      >
        <div class="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold text-slate-900">
              {{
                props.mode === "edit" ? "Editar máquina" : "Registrar máquina"
              }}
            </h2>
          </div>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Cerrar"
            @click="close"
          >
            ✕
          </button>
        </div>
        <form @submit.prevent="submit" class="mt-2 space-y-4">
          <!-- ID ahora es totalmente automático en el backend, no se pide aquí -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label class="block text-sm font-semibold mb-1"
              >Nombre de máquina<span class="text-sky-500">*</span></label
            >
            <input
              type="text"
              v-model="editableName"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white text-slate-700"
            />
          </div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label class="block text-sm font-semibold mb-1"
                >Tipo/Modelo<span class="text-sky-500">*</span></label
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
            <div>
              <label class="block text-sm font-semibold mb-1"
                >Serial<span class="text-sky-500">*</span></label
              >
              <input
                type="text"
                :value="`#${(props.count + 1).toString().padStart(3, '0')}`"
                readonly
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-100 text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1"
              >Ubicación<span class="text-sky-500">*</span></label
            >
            <input
              v-model="location"
              type="text"
              placeholder="Ej: Centro comercial - Pasillo D"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white text-slate-700"
              required
            />
          </div>
          <p class="mt-1 flex items-start gap-1 text-xs text-slate-500">
            <span aria-hidden="true">ℹ️</span>
            <span>
              La máquina se creará en estado "Inactivo" por defecto. Podrás
              editar sus datos más adelante desde el panel de control.
            </span>
          </p>
          <div class="flex gap-2 justify-end pt-4">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition cursor-pointer"
              @click="close"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 cursor-pointer"
            >
              {{
                props.mode === "edit" ? "Guardar cambios" : "Guardar máquina"
              }}
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
