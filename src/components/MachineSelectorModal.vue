<template>
  <transition name="modal" appear>
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div
        class="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        :class="
          isDark()
            ? 'bg-zinc-900/80 border-zinc-800 text-zinc-100'
            : 'bg-white border-slate-200 text-slate-900'
        "
      >
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
              :class="isDark() ? 'accent-red-500' : 'accent-red-600'"
            />
            <span :class="isDark() ? 'text-zinc-200' : ''"
              >{{ m.id }} - {{ m.location || m.name }}</span
            >
          </label>
        </div>
        <div class="flex gap-2 justify-end">
          <button
            type="button"
            :class="[
              'rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer',
              isDark()
                ? 'border-zinc-700 bg-zinc-900 text-red-400 hover:bg-zinc-950'
                : 'border-slate-200 bg-white text-red-500 hover:bg-red-50',
            ]"
            @click="$emit('close')"
          >
            Cancelar
          </button>
          <button
            type="button"
            :class="[
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow transition cursor-pointer',
              'bg-red-600 hover:bg-red-700',
            ]"
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
import { useTheme } from "@/composables/useTheme";
const { isDark: isDarkRef } = useTheme();
const isDark = () => isDarkRef.value;
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
