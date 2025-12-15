<template>
  <transition name="modal" appear>
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div class="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl">
        <h2 class="text-lg font-bold mb-4">Seleccionar máquinas</h2>
        <div class="max-h-64 overflow-y-auto mb-4">
          <label
            v-for="m in machines"
            :key="m.id"
            class="flex items-center gap-2 py-1 cursor-pointer"
          >
            <input
              type="checkbox"
              :value="m.id"
              v-model="localSelected"
              class="accent-red-600"
            />
            <span>{{ m.id }} - {{ m.location || m.name }}</span>
          </label>
        </div>
        <div class="flex gap-2 justify-end">
          <button
            type="button"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 transition cursor-pointer"
            @click="$emit('close')"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-red-700 cursor-pointer"
            @click="save"
          >
            Guardar selección
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from "vue";
const props = defineProps<{
  open: boolean;
  machines: { id: string; name: string; location?: string }[];
  selected: string[];
}>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", value: string[]): void;
}>();
const localSelected = ref<string[]>([...props.selected]);
watch(
  () => props.selected,
  (val) => {
    localSelected.value = [...val];
  }
);
function save() {
  emit("save", [...localSelected.value]);
  emit("close");
}
</script>

<style scoped>
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
