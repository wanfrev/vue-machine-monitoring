<script setup lang="ts">
import { inject, type Ref } from "vue";

const injectedDark = inject<Ref<boolean> | boolean>("darkMode", false);

const isDark = () => {
  if (typeof injectedDark === "boolean") return injectedDark;
  return !!injectedDark?.value;
};
</script>

<template>
  <div
    :class="[
      'px-2 py-4 sm:p-6',
      isDark() ? 'text-white bg-slate-900' : 'text-slate-900 bg-white',
    ]"
  >
    <div
      class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4"
    >
      <h1
        class="text-3xl font-bold"
        :class="isDark() ? 'text-white' : 'text-slate-900'"
      >
        Máquinas
      </h1>
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
          <tr
            class="border-t"
            :class="
              isDark()
                ? 'border-slate-800 hover:bg-slate-800'
                : 'border-slate-200 hover:bg-slate-50'
            "
          >
            <td class="px-4 py-2 whitespace-nowrap">A-001</td>
            <td class="px-4 py-2 whitespace-nowrap">Máquina de boxeo</td>
            <td class="px-4 py-2 whitespace-nowrap">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                :class="
                  isDark()
                    ? 'bg-green-900 text-green-200'
                    : 'bg-green-100 text-green-700'
                "
              >
                Activa
              </span>
            </td>
            <td class="px-4 py-2 whitespace-nowrap">92%</td>
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
          <tr
            class="border-t"
            :class="
              isDark()
                ? 'border-slate-800 hover:bg-slate-800'
                : 'border-slate-200 hover:bg-slate-50'
            "
          >
            <td class="px-4 py-2 whitespace-nowrap">B-001</td>
            <td class="px-4 py-2 whitespace-nowrap">Máquina de agilidad</td>
            <td class="px-4 py-2 whitespace-nowrap">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                :class="
                  isDark()
                    ? 'bg-amber-900 text-amber-200'
                    : 'bg-amber-100 text-amber-700'
                "
              >
                En espera
              </span>
            </td>
            <td class="px-4 py-2 whitespace-nowrap">81%</td>
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
