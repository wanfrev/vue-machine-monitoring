<script setup lang="ts">
import { computed, defineEmits, defineProps, ref, watch } from "vue";

const props = defineProps<{
  open: boolean;
  dark?: boolean;
  machines: { id: string; name: string }[];
  mode?: "create" | "edit";
  employee?: {
    id: number;
    documentId?: string;
    name: string;
    username: string;
    jobRole?: string;
    shift?: string;
    assignedMachineId?: string;
  } | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (
    e: "create",
    payload: {
      documentId: string;
      name: string;
      username: string;
      password: string;
      jobRole: string;
      shift?: string;
      assignedMachineId?: string;
    }
  ): void;
  (
    e: "update",
    payload: {
      id: number;
      documentId: string;
      name: string;
      username: string;
      password?: string;
      jobRole: string;
      shift?: string;
      assignedMachineId?: string;
    }
  ): void;
}>();

const documentId = ref("");
const name = ref("");
const username = ref("");
const password = ref("");
const jobRole = ref("");
const shift = ref("");
const assignedMachineId = ref("");
const editingId = ref<number | null>(null);

const isDark = computed(() => !!props.dark);

watch(
  () => props.open,
  (open) => {
    if (open) {
      if (props.mode === "edit" && props.employee) {
        editingId.value = props.employee.id;
        documentId.value = props.employee.documentId || "";
        name.value = props.employee.name || "";
        username.value = props.employee.username || "";
        password.value = ""; // No se muestra la contraseña actual
        jobRole.value = props.employee.jobRole || "";
        shift.value = props.employee.shift || "";
        assignedMachineId.value = props.employee.assignedMachineId || "";
      } else {
        editingId.value = null;
        documentId.value = "";
        name.value = "";
        username.value = "";
        password.value = "";
        jobRole.value = "";
        shift.value = "";
        assignedMachineId.value = "";
      }
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
  if (
    !documentId.value ||
    !name.value ||
    !username.value ||
    (!password.value && props.mode !== "edit") ||
    !jobRole.value
  ) {
    return;
  }
  if (props.mode === "edit" && editingId.value !== null) {
    emit("update", {
      id: editingId.value,
      documentId: documentId.value,
      name: name.value,
      username: username.value,
      password: password.value || undefined,
      jobRole: jobRole.value,
      shift: shift.value || undefined,
      assignedMachineId: assignedMachineId.value || undefined,
    });
  } else {
    emit("create", {
      documentId: documentId.value,
      name: name.value,
      username: username.value,
      password: password.value,
      jobRole: jobRole.value,
      shift: shift.value || undefined,
      assignedMachineId: assignedMachineId.value || undefined,
    });
  }
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
            >
              <svg
                v-if="props.mode === 'edit'"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M3 21v-3.75L16.81 3.44a2 2 0 0 1 2.83 0l1.92 1.92a2 2 0 0 1 0 2.83L7.75 21H3z"
                  stroke="currentColor"
                  stroke-width="0"
                  fill="currentColor"
                />
              </svg>
              <svg
                v-else
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 5v14"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M5 12h14"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            <div>
              <h2 class="text-xl font-bold text-slate-800">
                {{
                  props.mode === "edit" ? "Editar empleado" : "Nuevo empleado"
                }}
              </h2>
              <p class="text-sm text-slate-400">
                {{
                  props.mode === "edit"
                    ? "Edita los datos del empleado."
                    : "Crea un nuevo usuario empleado y asígnale una máquina."
                }}
              </p>
            </div>
          </div>
        </div>
        <form @submit.prevent="submit" class="space-y-3 mt-3">
          <div class="grid grid-cols-1 gap-3">
            <div>
              <label class="block text-sm font-semibold mb-1"
                >Cédula / ID<span class="text-red-500">*</span></label
              >
              <input
                v-model="documentId"
                type="text"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white text-slate-700"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1"
                >Nombre completo<span class="text-red-500">*</span></label
              >
              <input
                v-model="name"
                type="text"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white text-slate-700"
                required
              />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-semibold mb-1"
                  >Usuario<span class="text-red-500">*</span></label
                >
                <input
                  v-model="username"
                  type="text"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white text-slate-700"
                  required
                  :readonly="props.mode === 'edit'"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">
                  Contraseña
                  <span v-if="props.mode !== 'edit'" class="text-red-500"
                    >*</span
                  >
                </label>
                <input
                  v-model="password"
                  type="password"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white text-slate-700"
                  :required="props.mode !== 'edit'"
                  :placeholder="
                    props.mode === 'edit'
                      ? 'Dejar en blanco para mantener la actual'
                      : ''
                  "
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1"
                >Rol en máquina<span class="text-red-500">*</span></label
              >
              <input
                v-model="jobRole"
                type="text"
                placeholder="Ej: Operador"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white text-slate-700"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1">Turno</label>
              <input
                v-model="shift"
                type="text"
                placeholder="Ej: Nocturno"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white text-slate-700"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1"
                >Máquina asignada</label
              >
              <select
                v-model="assignedMachineId"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white text-slate-700 cursor-pointer"
              >
                <option value="">Sin asignar</option>
                <option v-for="m in machines" :key="m.id" :value="m.id">
                  {{ m.id }} - {{ m.name }}
                </option>
              </select>
            </div>
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
              <span class="text-lg ml-0">
                <svg
                  v-if="props.mode === 'edit'"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M3 21v-3.75L16.81 3.44a2 2 0 0 1 2.83 0l1.92 1.92a2 2 0 0 1 0 2.83L7.75 21H3z"
                    stroke="currentColor"
                    stroke-width="0"
                    fill="currentColor"
                  />
                </svg>
                <svg
                  v-else
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M12 5v14"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M5 12h14"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
              <span>{{
                props.mode === "edit" ? "Guardar cambios" : "Crear empleado"
              }}</span>
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
