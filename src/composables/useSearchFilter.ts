import { computed, ref } from "vue";

type SearchTextGetter<T> = (item: T) => string;

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

export function useSearchFilter<T>() {
  const searchQuery = ref("");
  const normalizedQuery = computed(() =>
    normalizeSearchValue(searchQuery.value)
  );

  function filterBySearch(items: T[], getSearchText: SearchTextGetter<T>): T[] {
    const q = normalizedQuery.value;
    if (!q) return items;
    const result: T[] = [];
    for (const item of items) {
      if (normalizeSearchValue(getSearchText(item)).includes(q)) {
        result.push(item);
      }
    }
    return result;
  }

  return {
    searchQuery,
    filterBySearch,
  };
}
