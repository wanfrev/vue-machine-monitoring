<template>
  <div
    v-if="open"
    :class="
      placement === 'static'
        ? 'w-full max-h-[70vh] overflow-auto overscroll-contain bg-white rounded-2xl border border-slate-200 shadow-xl p-5 flex flex-col gap-4'
        : 'absolute top-full right-0 z-[60] mt-2 w-80 max-h-[70vh] overflow-auto overscroll-contain bg-white rounded-2xl border border-slate-200 shadow-xl p-5 flex flex-col gap-4'
    "
    @click.stop
  >
    <div class="flex items-center gap-2 mb-2">
      <svg
        class="w-5 h-5 text-violet-600"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M3 4.6C3 4.03995 3 3.75992 3.10899 3.54601C3.20487 3.35785 3.35785 3.20487 3.54601 3.10899C3.75992 3 4.03995 3 4.6 3H19.4C19.9601 3 20.2401 3 20.454 3.10899C20.6422 3.20487 20.7951 3.35785 20.891 3.54601C21 3.75992 21 4.03995 21 4.6V6.33726C21 6.58185 21 6.70414 20.9724 6.81923C20.9479 6.92127 20.9075 7.01881 20.8526 7.10828C20.7908 7.2092 20.7043 7.29568 20.5314 7.46863L14.4686 13.5314C14.2957 13.7043 14.2092 13.7908 14.1474 13.8917C14.0925 13.9812 14.0521 14.0787 14.0276 14.1808C14 14.2959 14 14.4182 14 14.6627V17L10 21V14.6627C10 14.4182 10 14.2959 9.97237 14.1808C9.94787 14.0787 9.90747 13.9812 9.85264 13.8917C9.7908 13.7908 9.70432 13.7043 9.53137 13.5314L3.46863 7.46863C3.29568 7.29568 3.2092 7.2092 3.14736 7.10828C3.09253 7.01881 3.05213 6.92127 3.02763 6.81923C3 6.70414 3 6.58185 3 6.33726V4.6Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span class="font-semibold text-lg text-slate-700">Filtros</span>
    </div>
    <!-- Ubicación -->
    <div>
      <button
        class="w-full flex justify-between items-center font-semibold text-slate-700 mb-2"
      >
        Ubicación
        <span>&#9660;</span>
      </button>
      <div class="flex flex-col gap-1 pl-2">
        <label
          v-for="loc in locations"
          :key="loc"
          class="flex items-center gap-2 text-slate-600"
        >
          <input type="checkbox" v-model="selectedLocations" :value="loc" />
          {{ loc }}
        </label>
      </div>
    </div>
    <button
      class="w-full rounded-xl bg-red-600 text-white font-semibold py-2 mt-2 shadow transition hover:bg-red-700"
      @click="apply"
    >
      Aplicar
    </button>
  </div>
</template>

<script setup lang="ts">
/* global defineProps, defineEmits */
import { computed, ref } from "vue";

type FilterPayload = {
  locations: string[];
};

const props = defineProps<{
  open: boolean;
  locations: string[];
  placement?: "absolute" | "static";
}>();

const placement = computed(() => props.placement || "absolute");

const emit = defineEmits<{
  (e: "close"): void;
  (e: "apply", payload: FilterPayload): void;
}>();

const selectedLocations = ref<string[]>([]);
const locations = computed(() => props.locations || []);

function apply() {
  emit("apply", {
    locations: selectedLocations.value,
  });
}
</script>
