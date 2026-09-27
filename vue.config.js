const { defineConfig } = require("@vue/cli-service");

module.exports = defineConfig({
  transpileDependencies: true,
  // Los .map pesan ~4 MB y se publicaban junto al sitio sin que la app los use.
  productionSourceMap: false,
  pwa: {
    name: "K11 Box",
    themeColor: "#0a0a0a",
    msTileColor: "#0a0a0a",
    iconPaths: {
      // Usamos los iconos generados a partir de K11BOX
      favicon32: "img/icons/icon-no-padding-192.png",
      favicon16: "img/icons/icon-no-padding-192.png",
      appleTouchIcon: "img/icons/icon-no-padding-512.png",
      maskIcon: "img/icons/pwa-512x512.png",
      msTileImage: "img/icons/icon-no-padding-192.png",
    },
    workboxPluginMode: "InjectManifest",
    workboxOptions: {
      // Use a relative path to ensure webpack resolves it correctly in CI/build env
      swSrc: "./src/custom-service-worker.js",
      swDest: "custom-service-worker.js",
    },
  },
});
