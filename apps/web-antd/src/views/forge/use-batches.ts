import type {
  ForgeBatch,
  ForgeBatchImportInfo,
  ForgeBatchRollbackResult,
} from '#/api';

import { ref } from 'vue';

import {
  getForgeBatchesApi,
  importForgeBatchApi,
  rollbackForgeBatchApi,
} from '#/api';

/**
 * Batch list plus the import/rollback action flow. Local state is updated
 * from each action's response so the table reflects the outcome without a
 * reload; the page may still refetch to pick up server-side side effects.
 */
export function useBatches() {
  const batches = ref<ForgeBatch[]>([]);
  const loading = ref(false);
  /**
   * Batch ids with an in-flight import or rollback. A Vue reactive Set, so
   * `pending.has(id)` is tracked in templates and computed values.
   */
  const pending = ref<Set<string>>(new Set());

  async function fetchBatches() {
    loading.value = true;
    try {
      const res = await getForgeBatchesApi();
      batches.value = res.batches;
    } finally {
      loading.value = false;
    }
  }

  function patchBatch(batchId: string, patch: Partial<ForgeBatch>) {
    const index = batches.value.findIndex(
      (batch) => batch.batch_id === batchId,
    );
    if (index === -1) return;
    batches.value[index] = { ...batches.value[index], ...patch } as ForgeBatch;
  }

  /** Import one batch; rethrows (e.g. 502 with reason) on failure. */
  async function importBatch(
    batchId: string,
  ): Promise<ForgeBatchImportInfo | null> {
    if (pending.value.has(batchId)) return null;
    pending.value.add(batchId);
    try {
      const res = await importForgeBatchApi(batchId);
      patchBatch(batchId, { imported: res.imported });
      return res.imported;
    } finally {
      pending.value.delete(batchId);
    }
  }

  /** Roll back one batch; rethrows on failure. */
  async function rollbackBatch(
    batchId: string,
  ): Promise<ForgeBatchRollbackResult | null> {
    if (pending.value.has(batchId)) return null;
    pending.value.add(batchId);
    try {
      const res = await rollbackForgeBatchApi(batchId);
      patchBatch(batchId, { imported: null });
      return res;
    } finally {
      pending.value.delete(batchId);
    }
  }

  return {
    batches,
    fetchBatches,
    importBatch,
    loading,
    pending,
    rollbackBatch,
  };
}
