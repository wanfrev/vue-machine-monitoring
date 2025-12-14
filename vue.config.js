const { defineConfig } = require("@vue/cli-service");

module.exports = defineConfig({
  transpileDependencies: true,
  pwa: {
    name: "MachineHub",
    themeColor: "#ffffff",
    msTileColor: "#ffffff",
    iconPaths: {
      // Usamos los iconos generados a partir de K11BOX
      favicon32: "img/icons/pwa-64x64.png",
      favicon16: "img/icons/pwa-64x64.png",
      appleTouchIcon: "img/icons/apple-touch-icon-180x180.png",
      maskIcon: "img/icons/pwa-512x512.png",
      msTileImage: "img/icons/mstile-150x150.png",
    },
  },
});
