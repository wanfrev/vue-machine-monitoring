<script setup lang="ts">
import { computed, ref, watch } from "vue";
import MachineSelectorModal from "./MachineSelectorModal.vue";
// eslint-disable-next-line no-undef
const props = defineProps<{
  open: boolean;
  dark?: boolean;
  machines: { id: string; name: string; location?: string }[];
  mode?: "create" | "edit";
  employee?: {
    id: number;
    documentId?: string;
    name: string;
    username: string;
    jobRole?: string;
    shift?: string;
    assignedMachineIds?: string[];
  } | null;
}>();

// eslint-disable-next-line no-undef
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
      assignedMachineIds?: string[];
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
      assignedMachineIds?: string[];
    }
  ): void;
}>();

const documentId = ref("");
const name = ref("");
const username = ref("");
const password = ref("");
const jobRole = ref("");
const shift = ref("");
const assignedMachineIds = ref<string[]>([]);
const showMachineModal = ref(false);

function openMachineModal() {
  showMachineModal.value = true;
}
function closeMachineModal() {
  showMachineModal.value = false;
}
function saveMachineSelection(selected: string[]) {
  assignedMachineIds.value = selected;
}
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
        assignedMachineIds.value = props.employee.assignedMachineIds || [];
      } else {
        editingId.value = null;
        documentId.value = "";
        name.value = "";
        username.value = "";
        password.value = "";
        jobRole.value = "";
        shift.value = "";
        assignedMachineIds.value = [];
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
  // Determinar el valor del campo 'role' según el jobRole seleccionado
  let roleValue = "employee";
  if (jobRole.value === "Operador") {
    roleValue = "operator";
  }
  if (props.mode === "edit" && editingId.value !== null) {
    emit("update", {
      id: editingId.value,
      documentId: documentId.value,
      name: name.value,
      username: username.value,
      password: password.value || undefined,
      jobRole: jobRole.value,
      role: roleValue,
      shift: shift.value || undefined,
      assignedMachineIds:
        assignedMachineIds.value.length > 0
          ? assignedMachineIds.value
          : undefined,
    });
  } else {
    emit("create", {
      documentId: documentId.value,
      name: name.value,
      username: username.value,
      password: password.value,
      jobRole: jobRole.value,
      role: roleValue,
      shift: shift.value || undefined,
      assignedMachineIds:
        assignedMachineIds.value.length > 0
          ? assignedMachineIds.value
          : undefined,
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
                  props.mode === "edit"
                    ? "Editar supervisor"
                    : "Nuevo supervisor"
                }}
              </h2>
              <p class="text-sm text-slate-400">
                {{
                  props.mode === "edit"
                    ? "Edita los datos del supervisor."
                    : "Crea un nuevo usuario supervisor y asígnale una máquina."
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
              <select
                v-model="jobRole"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white text-slate-700"
                required
              >
                <option value="">Selecciona un rol</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Operador">Operador</option>
              </select>
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
                >Máquinas asignadas (por ubicación)</label
              >
              <div class="flex gap-2 items-center">
                <button
                  type="button"
                  class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 transition cursor-pointer"
                  @click="openMachineModal"
                >
                  Seleccionar máquinas
                </button>
                <span
                  v-if="assignedMachineIds.length"
                  class="text-xs text-slate-500"
                >
                  {{ assignedMachineIds.length }} seleccionada(s)
                </span>
              </div>
              <ul
                v-if="assignedMachineIds.length"
                class="mt-2 text-xs text-slate-600 list-disc list-inside"
              >
                <li v-for="id in assignedMachineIds" :key="id">
                  {{
                    machines.find((m) => m.id === id)?.location ||
                    machines.find((m) => m.id === id)?.name ||
                    id
                  }}
                </li>
              </ul>
              <MachineSelectorModal
                :open="showMachineModal"
                :machines="machines"
                :selected="assignedMachineIds"
                @close="closeMachineModal"
                @save="saveMachineSelection"
              />
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
                props.mode === "edit" ? "Guardar cambios" : "Crear supervisor"
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
