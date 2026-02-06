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

// Preload coin values (best-effort)
try {
  const { ensureLoaded } = useCoinValues();
  void ensureLoaded();
} catch {
  // ignore
}

createApp(App).use(store).use(router).mount("#app");
