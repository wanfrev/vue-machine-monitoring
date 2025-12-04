import { createApp } from "vue";
import App from "./App.vue";
import "./registerServiceWorker";
import router from "./router";
import store from "./store";
import "./assets/tailwind.css";
import { setAuthToken } from "./api/client";

const savedToken = localStorage.getItem("token");
setAuthToken(savedToken);

createApp(App).use(store).use(router).mount("#app");
