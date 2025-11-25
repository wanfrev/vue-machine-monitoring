<template>
  <div
    class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-purple-700"
  >
    <nav class="mb-8">
      <router-link
        to="/"
        class="px-4 py-2 rounded bg-white/10 text-white hover:bg-white/20 transition"
      >
        Home
      </router-link>
      <span class="mx-2 text-white">|</span>
      <router-link
        to="/about"
        class="px-4 py-2 rounded bg-white/10 text-white hover:bg-white/20 transition"
      >
        About
      </router-link>
    </nav>
    <h1 class="text-4xl font-bold text-white mb-6 drop-shadow-lg">
      Tailwind funcionando 🚀
    </h1>
    <router-view />
  </div>
</template>

<style>
/* Puedes borrar este bloque si no lo necesitas, Tailwind ya se encarga de los estilos */
</style>
