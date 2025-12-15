const { defineConfig } = require("@vue/cli-service");

module.exports = defineConfig({
  transpileDependencies: true,
  pwa: {
    name: "MachineHub",
    themeColor: "#ffffff",
    msTileColor: "#ffffff",
    iconPaths: {
      // Usamos los iconos generados a partir de K11BOX
      favicon32: "img/icons/icon-no-padding-192.png",
      favicon16: "img/icons/icon-no-padding-192.png",
      appleTouchIcon: "img/icons/icon-no-padding-512.png",
      maskIcon: "img/icons/pwa-512x512.png",
      msTileImage: "img/icons/icon-no-padding-192.png",
    },
  },
});
