import { createApp } from "vue";
import App from "./App.vue";
import "./registerServiceWorker";
import router from "./router";
import store from "./store";
import "./assets/tailwind.css";
import { setAuthToken } from "./api/client";
import { useCoinValues } from "./composables/useCoinValues";

const savedToken = localStorage.getItem("token");
setAuthToken(savedToken);

const initialPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
sessionStorage.setItem("appInitialPath", initialPath);
sessionStorage.setItem("appInitialHandled", "0");

// Preload coin values (best-effort)
try {
  const { ensureLoaded } = useCoinValues();
  void ensureLoaded();
} catch {
  // ignore
}

createApp(App).use(store).use(router).mount("#app");
