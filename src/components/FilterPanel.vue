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
    <div class="mb-3">
      <p
        class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
      >
        Filtros
      </p>
      <p class="text-sm font-semibold text-slate-800 mt-0.5">
        Filtrar por ubicación
      </p>
    </div>
    <!-- Ubicación -->
    <div>
      <p class="mb-2 text-xs font-semibold text-slate-600">Ubicación</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="loc in locations"
          :key="loc"
          type="button"
          class="px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer"
          :class="
            selectedLocations.includes(loc)
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-800'
          "
          @click="toggleLocation(loc)"
        >
          {{ loc }}
        </button>
      </div>
    </div>
    <button
      class="w-full rounded-xl bg-slate-900 text-white font-semibold py-2 mt-4 transition hover:bg-slate-800"
      @click="apply"
    >
      Aplicar
    </button>
    <button
      class="self-center mt-1 px-2 py-1 text-xs font-medium text-slate-400 hover:text-slate-600"
      @click="resetFilters"
    >
      Limpiar filtros
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

function toggleLocation(loc: string) {
  const current = selectedLocations.value;
  if (current.includes(loc)) {
    selectedLocations.value = current.filter((l) => l !== loc);
  } else {
    selectedLocations.value = [...current, loc];
  }
}

function apply() {
  emit("apply", {
    locations: selectedLocations.value,
  });
}

function resetFilters() {
  selectedLocations.value = [];
  emit("apply", {
    locations: [],
  });
}
</script>
