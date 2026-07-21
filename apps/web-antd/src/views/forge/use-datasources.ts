import type { ForgeDatasource, ForgeDatasourceRefreshResult } from '#/api';

import { ref } from 'vue';

import { getForgeDatasourcesApi, refreshForgeDatasourceApi } from '#/api';

/**
 * Datasource list plus the per-row refresh flow. The refresh result is
 * returned to the caller for display; after a successful refresh the page
 * refetches so record counts and cleaned_at stay authoritative.
 */
export function useDatasources() {
  const datasources = ref<ForgeDatasource[]>([]);
  const blacklistCount = ref(0);
  const loading = ref(false);
  /**
   * Datasource names with an in-flight refresh. A Vue reactive Set, so
   * `pending.has(name)` is tracked in templates and computed values.
   */
  const pending = ref<Set<string>>(new Set());

  async function fetchDatasources() {
    loading.value = true;
    try {
      const res = await getForgeDatasourcesApi();
      datasources.value = res.datasources;
      blacklistCount.value = res.blacklist_count;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Refresh one datasource; returns the server's diff result as-is (including
   * `ok: false` + `error`), rethrows only on transport/HTTP failures.
   */
  async function refreshDatasource(
    name: string,
  ): Promise<ForgeDatasourceRefreshResult | null> {
    if (pending.value.has(name)) return null;
    pending.value.add(name);
    try {
      return await refreshForgeDatasourceApi(name);
    } finally {
      pending.value.delete(name);
    }
  }

  return {
    blacklistCount,
    datasources,
    fetchDatasources,
    loading,
    pending,
    refreshDatasource,
  };
}
