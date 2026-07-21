import type { ForgeBatch } from '#/api';

import { beforeEach, describe, expect, it, vi } from 'vitest';

function makeBatch(
  overrides: Partial<ForgeBatch> & { batch_id: string },
): ForgeBatch {
  return {
    file: `out/production/${overrides.batch_id}.jsonl`,
    items: 100,
    categories: [{ slug: 'hsk4:reading:mc', count: 100 }],
    imported: null,
    blacklisted_count: 0,
    ...overrides,
  };
}

const importedInfo = {
  at: '2026-07-21T01:00:00Z',
  task_id: 'task-9',
  processed: 98,
  failed_count: 2,
};

describe('useBatches', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function setup(apiMocks: {
    import_?: ReturnType<typeof vi.fn>;
    list?: ReturnType<typeof vi.fn>;
    rollback?: ReturnType<typeof vi.fn>;
  }) {
    vi.doMock('#/api', () => ({
      getForgeBatchesApi: apiMocks.list ?? vi.fn(),
      importForgeBatchApi: apiMocks.import_ ?? vi.fn(),
      rollbackForgeBatchApi: apiMocks.rollback ?? vi.fn(),
    }));
    const { useBatches } = await import('./use-batches');
    return useBatches();
  }

  it('fetches the batch list', async () => {
    const store = await setup({
      list: vi.fn().mockResolvedValue({
        batches: [makeBatch({ batch_id: 'b1' }), makeBatch({ batch_id: 'b2' })],
      }),
    });
    await store.fetchBatches();
    expect(store.batches.value).toHaveLength(2);
    expect(store.loading.value).toBe(false);
  });

  it('marks the batch imported from the import response', async () => {
    const mockImport = vi
      .fn()
      .mockResolvedValue({ batch_id: 'b1', imported: importedInfo });
    const store = await setup({
      import_: mockImport,
      list: vi
        .fn()
        .mockResolvedValue({ batches: [makeBatch({ batch_id: 'b1' })] }),
    });
    await store.fetchBatches();
    const result = await store.importBatch('b1');
    expect(mockImport).toHaveBeenCalledWith('b1');
    expect(result).toEqual(importedInfo);
    expect(store.batches.value[0]?.imported).toEqual(importedInfo);
    expect(store.pending.value.size).toBe(0);
  });

  it('rethrows import failures (502) and keeps the batch unimported', async () => {
    const serverError = { detail: 'v2 question bank unreachable' };
    const store = await setup({
      import_: vi.fn().mockRejectedValue(serverError),
      list: vi
        .fn()
        .mockResolvedValue({ batches: [makeBatch({ batch_id: 'b1' })] }),
    });
    await store.fetchBatches();
    const error = await store
      .importBatch('b1')
      .catch((error_: unknown) => error_);
    expect(error).toEqual(serverError);
    expect(store.batches.value[0]?.imported).toBeNull();
    expect(store.pending.value.size).toBe(0);
  });

  it('clears the import state after a rollback', async () => {
    const mockRollback = vi
      .fn()
      .mockResolvedValue({ batch_id: 'b1', deleted: 98, missing: 2 });
    const store = await setup({
      list: vi.fn().mockResolvedValue({
        batches: [makeBatch({ batch_id: 'b1', imported: importedInfo })],
      }),
      rollback: mockRollback,
    });
    await store.fetchBatches();
    const result = await store.rollbackBatch('b1');
    expect(mockRollback).toHaveBeenCalledWith('b1');
    expect(result).toMatchObject({ deleted: 98, missing: 2 });
    expect(store.batches.value[0]?.imported).toBeNull();
    expect(store.pending.value.size).toBe(0);
  });

  it('ignores a second import while one is in flight', async () => {
    let resolveImport: (value: unknown) => void = () => {};
    const mockImport = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveImport = resolve;
        }),
    );
    const store = await setup({
      import_: mockImport,
      list: vi
        .fn()
        .mockResolvedValue({ batches: [makeBatch({ batch_id: 'b1' })] }),
    });
    await store.fetchBatches();
    const first = store.importBatch('b1');
    expect(store.pending.value.has('b1')).toBe(true);
    const second = await store.importBatch('b1');
    expect(second).toBeNull();
    expect(mockImport).toHaveBeenCalledTimes(1);
    resolveImport({ batch_id: 'b1', imported: importedInfo });
    await first;
    expect(store.pending.value.has('b1')).toBe(false);
  });
});
