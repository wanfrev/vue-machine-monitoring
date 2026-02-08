export type LocalSaleEntry = {
  id: string;
  machineId: string;
  date: string; // YYYY-MM-DD
  coins: number;
  prizeBs?: number | null;
  lost?: number | null;
  returned?: number | null;
  recordMessage?: string | null;
  createdAt: string;
  employeeUsername?: string;
};

type LocalSalesHistoryFilter = {
  machineId: string;
  date: string;
  employeeUsername?: string;
};

const STORAGE_KEY = "mm:local-sales-history:v1";
const MAX_ENTRIES = 300;

function readAll(): LocalSaleEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row) => row && typeof row === "object"
    ) as LocalSaleEntry[];
  } catch {
    return [];
  }
}

function writeAll(entries: LocalSaleEntry[]) {
  const trimmed = entries.slice(-MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addLocalSaleEntry(input: Omit<LocalSaleEntry, "id">) {
  const entry: LocalSaleEntry = { ...input, id: makeId() };
  const all = readAll();
  all.push(entry);
  writeAll(all);
  return entry;
}

export function getLocalSalesHistory(filter: LocalSalesHistoryFilter) {
  const all = readAll();
  const filtered = all.filter((row) => {
    if (row.machineId !== filter.machineId) return false;
    if (row.date !== filter.date) return false;
    if (filter.employeeUsername && row.employeeUsername) {
      return row.employeeUsername === filter.employeeUsername;
    }
    if (filter.employeeUsername && !row.employeeUsername) return false;
    return true;
  });

  return filtered.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return bTime - aTime;
  });
}
