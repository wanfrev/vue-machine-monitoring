import { ref } from "vue";
import {
  getCoinValues as apiGetCoinValues,
  setCoinValue as apiSetCoinValue,
} from "@/api/client";
import { setCoinValuesByType } from "@/utils/machine";

const STORAGE_KEY = "coinValuesByType";

const coinValues = ref<Record<string, number>>({});
const loaded = ref(false);
const loading = ref(false);

function normalizeMap(input: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!input || typeof input !== "object") return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const num = Number(v);
    if (!k) continue;
    if (!Number.isFinite(num)) continue;
    out[String(k).trim().toLowerCase()] = num;
  }
  return out;
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const normalized = normalizeMap(parsed);
    coinValues.value = normalized;
    setCoinValuesByType(normalized);
  } catch {
    // ignore
  }
}

async function loadFromApi() {
  const data = await apiGetCoinValues();
  const normalized = normalizeMap(data);
  coinValues.value = normalized;
  setCoinValuesByType(normalized);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function useCoinValues() {
  async function ensureLoaded() {
    if (loaded.value || loading.value) return;
    loading.value = true;
    try {
      loadFromStorage();
      await loadFromApi();
      loaded.value = true;
    } catch {
      // If API fails, keep any stored values
      loaded.value = true;
    } finally {
      loading.value = false;
    }
  }

  async function refresh() {
    loading.value = true;
    try {
      await loadFromApi();
      loaded.value = true;
    } finally {
      loading.value = false;
    }
  }

  async function setValue(type: string, value: number) {
    const key = String(type || "")
      .trim()
      .toLowerCase();
    if (!key) throw new Error("Invalid type");
    await apiSetCoinValue(key, value);
    await refresh();
  }

  return {
    coinValues,
    loaded,
    loading,
    ensureLoaded,
    refresh,
    setValue,
  };
}
