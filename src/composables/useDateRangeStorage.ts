import { type Ref } from "vue";

type DateRangeStorageOptions<TExtra extends Record<string, unknown>> = {
  storageKey: Ref<string> | string;
  startDate: Ref<string>;
  endDate: Ref<string>;
  isActive: () => boolean;
  readExtra?: (data: TExtra) => void;
  writeExtra?: () => TExtra;
};

type DateRangeStorageResult = {
  readStoredRange: () => void;
  writeStoredRange: () => void;
  clearStoredRange: () => void;
};

function resolveStorageKey(storageKey: Ref<string> | string): string {
  return typeof storageKey === "string" ? storageKey : storageKey.value;
}

export function useDateRangeStorage<
  TExtra extends Record<string, unknown> = Record<string, unknown>
>(options: DateRangeStorageOptions<TExtra>): DateRangeStorageResult {
  function readStoredRange() {
    try {
      const key = resolveStorageKey(options.storageKey);
      if (!key) return;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        startDate?: string;
        endDate?: string;
      } & TExtra;
      if (parsed.startDate) options.startDate.value = parsed.startDate;
      if (parsed.endDate) options.endDate.value = parsed.endDate;
      if (options.readExtra) options.readExtra(parsed as TExtra);
    } catch {
      // ignore
    }
  }

  function writeStoredRange() {
    try {
      const key = resolveStorageKey(options.storageKey);
      if (!key) return;
      if (!options.isActive()) {
        localStorage.removeItem(key);
        return;
      }
      const payload: Record<string, unknown> = {
        startDate: options.startDate.value,
        endDate: options.endDate.value,
      };
      if (options.writeExtra) {
        Object.assign(payload, options.writeExtra());
      }
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }

  function clearStoredRange() {
    try {
      const key = resolveStorageKey(options.storageKey);
      if (!key) return;
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  return {
    readStoredRange,
    writeStoredRange,
    clearStoredRange,
  };
}
