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
        Empleados
      </h1>
      <button
        type="button"
        class="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium text-white shadow-sm"
      >
        + Nuevo empleado
      </button>
    </div>
    <p
      class="text-sm mb-4"
      :class="isDark() ? 'text-slate-300' : 'text-slate-600'"
    >
      Maquetación del CRUD de empleados. Luego se conectará al backend.
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
            <th class="px-4 py-2 whitespace-nowrap">Rol</th>
            <th class="px-4 py-2 whitespace-nowrap">Turno</th>
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
            <td class="px-4 py-2 whitespace-nowrap">E-001</td>
            <td class="px-4 py-2 whitespace-nowrap">Juan Pérez</td>
            <td class="px-4 py-2 whitespace-nowrap">Operador</td>
            <td class="px-4 py-2 whitespace-nowrap">Nocturno</td>
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
