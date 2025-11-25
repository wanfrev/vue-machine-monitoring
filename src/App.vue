<template>
  <div
    class="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black to-blue-700 overflow-hidden"
  >
    <!-- Estrellas -->
    <div class="absolute inset-0 pointer-events-none select-none">
      <div
        v-for="n in 60"
        :key="n"
        :style="{
          position: 'absolute',
          top: Math.random() * 100 + '%',
          left: Math.random() * 100 + '%',
          width: Math.random() * 2 + 1 + 'px',
          height: Math.random() * 2 + 1 + 'px',
          background: 'white',
          borderRadius: '50%',
          opacity: Math.random() * 0.5 + 0.5,
          boxShadow: '0 0 6px 2px white',
        }"
      />
    </div>
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
