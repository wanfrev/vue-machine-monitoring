<script setup lang="ts">
import { inject, type Ref, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppSidebar from "@/components/AppSidebar.vue";
import { getMachines } from "../api/client";

const router = useRouter();
const sidebarOpen = ref(false);

const injectedDark = inject<Ref<boolean> | boolean>("darkMode", false);
const isDark = () => {
  if (typeof injectedDark === "boolean") return injectedDark;
  return !!injectedDark?.value;
};

type Machine = { id: string; name: string; status: string; location?: string };
const loading = ref(false);
const machines = ref<Machine[]>([]);

onMounted(async () => {
  loading.value = true;
  try {
    machines.value = await getMachines();
  } catch (e) {
    // Podríamos mostrar un toast
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <AppSidebar
    :open="sidebarOpen"
    :dark="isDark()"
    @close="sidebarOpen = false"
    @open="() => {}"
  />
  <div
    :class="[
      'px-2 py-4 sm:p-6',
      isDark() ? 'text-white bg-slate-900' : 'text-slate-900 bg-white',
    ]"
  >
    <div
      class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4"
    >
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-lg border text-slate-500 transition cursor-pointer"
          :class="
            isDark()
              ? 'border-red-300 bg-red-700 hover:bg-red-600 hover:text-white'
              : 'border-red-200 bg-red-100 hover:bg-red-200 hover:text-red-700'
          "
          aria-label="Abrir menú lateral"
          @click="sidebarOpen = true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 512 512"
            fill="none"
          >
            <path
              d="M315.27,33,96,304H224L192.49,477.23a2.36,2.36,0,0,0,2.33,2.77h0a2.36,2.36,0,0,0,1.89-.95L416,208H288L319.66,34.75A2.45,2.45,0,0,0,317.22,32h0A2.42,2.42,0,0,0,315.27,33Z"
              :stroke="isDark() ? '#ffffff' : '#000000'"
              stroke-width="28"
            />
          </svg>
        </button>
        <h1
          class="text-3xl font-bold"
          :class="isDark() ? 'text-white' : 'text-slate-900'"
        >
          Máquinas
        </h1>
      </div>
      <button
        type="button"
        class="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium text-white shadow-sm"
      >
        + Nueva máquina
      </button>
    </div>
    <p
      class="text-sm mb-4"
      :class="isDark() ? 'text-slate-300' : 'text-slate-600'"
    >
      Aquí luego se conectará el CRUD real contra la Raspberry Pi.
    </p>
    <div
      class="overflow-x-auto rounded-xl border shadow-sm"
      :class="
        isDark() ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
      "
    >
      <table
        class="min-w-full text-left text-sm"
        :class="isDark() ? 'text-slate-100' : 'text-slate-900'"
      >
        <thead
          :class="
            isDark()
              ? 'bg-slate-800 text-slate-300'
              : 'bg-slate-50 text-slate-600'
          "
        >
          <tr>
            <th class="px-4 py-2 whitespace-nowrap">ID</th>
            <th class="px-4 py-2 whitespace-nowrap">Nombre</th>
            <th class="px-4 py-2 whitespace-nowrap">Estado</th>
            <th class="px-4 py-2 whitespace-nowrap">OEE</th>
            <th class="px-4 py-2 text-right whitespace-nowrap">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td class="px-4 py-3" colspan="5">Cargando...</td>
          </tr>
          <tr
            v-for="m in machines"
            :key="m.id"
            class="border-t"
            :class="
              isDark()
                ? 'border-slate-800 hover:bg-slate-800'
                : 'border-slate-200 hover:bg-slate-50'
            "
          >
            <td class="px-4 py-2 whitespace-nowrap">{{ m.id }}</td>
            <td class="px-4 py-2 whitespace-nowrap">{{ m.name }}</td>
            <td class="px-4 py-2 whitespace-nowrap">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                :class="
                  m.status === 'active'
                    ? isDark()
                      ? 'bg-green-900 text-green-200'
                      : 'bg-green-100 text-green-700'
                    : isDark()
                    ? 'bg-slate-800 text-slate-200'
                    : 'bg-slate-100 text-slate-700'
                "
              >
                {{ m.status === "active" ? "Activa" : "Inactiva" }}
              </span>
            </td>
            <td class="px-4 py-2 whitespace-nowrap">—</td>
            <td
              class="px-4 py-2 text-right text-sm space-x-2 whitespace-nowrap"
            >
              <button class="text-red-500 hover:underline" type="button">
                Ver
              </button>
              <button class="text-amber-500 hover:underline" type="button">
                Editar
              </button>
              <button class="text-slate-400 hover:underline" type="button">
                Eliminar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
