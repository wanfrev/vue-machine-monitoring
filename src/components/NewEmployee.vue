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

const selectedMachines = computed(() =>
  assignedMachineIds.value
    .map((id) => props.machines.find((m) => m.id === id) || null)
    .filter((m): m is { id: string; name: string; location?: string } => !!m)
);

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

function removeMachine(id: string) {
  assignedMachineIds.value = assignedMachineIds.value.filter(
    (mid) => mid !== id
  );
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
        class="w-full max-w-xl rounded-2xl border bg-white p-6 shadow-2xl"
        :class="
          isDark
            ? 'border-slate-800 bg-slate-900 text-slate-100'
            : 'border-slate-200 bg-white text-slate-700'
        "
      >
        <div class="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold text-slate-900">
              {{
                props.mode === "edit"
                  ? "Editar miembro del equipo"
                  : "Nuevo miembro del equipo"
              }}
            </h2>
            <p class="mt-1 text-xs text-slate-500">
              Gestión de accesos y asignaciones
            </p>
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
          <div class="grid gap-4">
            <!-- Fila 1: Identidad -->
            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div class="md:col-span-2">
                <label class="block text-sm font-semibold mb-1"
                  >Nombre completo<span class="text-sky-500">*</span></label
                >
                <input
                  v-model="name"
                  type="text"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white text-slate-700"
                  required
                />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1"
                  >Cédula / ID<span class="text-sky-500">*</span></label
                >
                <input
                  v-model="documentId"
                  type="text"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white text-slate-700"
                  required
                />
              </div>
            </div>

            <!-- Fila 2: Cuenta -->
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label class="block text-sm font-semibold mb-1"
                  >Usuario<span class="text-sky-500">*</span></label
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
                  <span v-if="props.mode !== 'edit'" class="text-sky-500"
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

            <!-- Fila 3: Rol y turno -->
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label class="block text-sm font-semibold mb-1"
                  >Rol<span class="text-sky-500">*</span></label
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
            </div>

            <!-- Fila 4: Máquinas asignadas -->
            <div>
              <label class="block text-sm font-semibold mb-1"
                >Máquinas asignadas</label
              >
              <button
                type="button"
                class="mt-1 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:border-sky-400 hover:bg-sky-50/40 transition cursor-pointer"
                @click="openMachineModal"
              >
                <span class="truncate">
                  {{
                    assignedMachineIds.length
                      ? "Editar selección de máquinas"
                      : "Seleccionar máquinas..."
                  }}
                </span>
                <svg
                  class="h-4 w-4 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>

              <div
                v-if="selectedMachines.length"
                class="mt-2 flex flex-wrap gap-2"
              >
                <button
                  v-for="m in selectedMachines"
                  :key="m.id"
                  type="button"
                  class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-200"
                  @click.stop
                >
                  <span class="truncate">
                    {{ m.location || m.name }}
                  </span>
                  <span
                    class="cursor-pointer text-slate-400 hover:text-slate-700"
                    aria-label="Quitar máquina"
                    @click.stop="removeMachine(m.id)"
                  >
                    ✕
                  </span>
                </button>
              </div>

              <MachineSelectorModal
                :open="showMachineModal"
                :machines="machines"
                :selected="assignedMachineIds"
                @close="closeMachineModal"
                @save="saveMachineSelection"
              />
            </div>
          </div>
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
