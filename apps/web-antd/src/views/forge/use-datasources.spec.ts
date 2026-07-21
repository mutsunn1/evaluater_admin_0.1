import type { ForgeDatasource } from '#/api';

import { beforeEach, describe, expect, it, vi } from 'vitest';

function makeDatasource(
  overrides: Partial<ForgeDatasource> & { name: string },
): ForgeDatasource {
  return {
    license: 'MIT',
    records: { vocab: 1000 },
    cleaned_at: '2026-07-20T00:00:00Z',
    source_repo: 'https://github.com/example/repo',
    status: 'ok',
    ...overrides,
  };
}

describe('useDatasources', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function setup(apiMocks: {
    list?: ReturnType<typeof vi.fn>;
    refresh?: ReturnType<typeof vi.fn>;
  }) {
    vi.doMock('#/api', () => ({
      getForgeDatasourcesApi: apiMocks.list ?? vi.fn(),
      refreshForgeDatasourceApi: apiMocks.refresh ?? vi.fn(),
    }));
    const { useDatasources } = await import('./use-datasources');
    return useDatasources();
  }

  it('fetches datasources and the blacklist count', async () => {
    const store = await setup({
      list: vi.fn().mockResolvedValue({
        datasources: [
          makeDatasource({ name: 'a' }),
          makeDatasource({ name: 'b' }),
        ],
        blacklist_count: 7,
      }),
    });
    await store.fetchDatasources();
    expect(store.datasources.value).toHaveLength(2);
    expect(store.blacklistCount.value).toBe(7);
    expect(store.loading.value).toBe(false);
  });

  it('returns the refresh diff result and clears pending', async () => {
    const refreshResult = {
      name: 'a',
      before: 900,
      after: 1000,
      diff: { added: 120, removed: 20 },
      ok: true,
    };
    const mockRefresh = vi.fn().mockResolvedValue(refreshResult);
    const store = await setup({ refresh: mockRefresh });
    const result = await store.refreshDatasource('a');
    expect(mockRefresh).toHaveBeenCalledWith('a');
    expect(result).toEqual(refreshResult);
    expect(store.pending.value.size).toBe(0);
  });

  it('surfaces a failed refresh (ok: false with error)', async () => {
    const refreshResult = {
      name: 'a',
      before: 0,
      after: 0,
      diff: { added: 0, removed: 0 },
      ok: false,
      error: 'git clone timeout',
    };
    const store = await setup({
      refresh: vi.fn().mockResolvedValue(refreshResult),
    });
    const result = await store.refreshDatasource('a');
    expect(result?.ok).toBe(false);
    expect(result?.error).toBe('git clone timeout');
  });

  it('blocks a second refresh of the same datasource but not others', async () => {
    const resolvers = new Map<string, (value: unknown) => void>();
    const mockRefresh = vi.fn(
      (name: string) =>
        new Promise((resolve) => {
          resolvers.set(name, resolve);
        }),
    );
    const store = await setup({ refresh: mockRefresh });
    const first = store.refreshDatasource('a');
    expect(store.pending.value.has('a')).toBe(true);

    // Same name: ignored while in flight.
    const duplicate = await store.refreshDatasource('a');
    expect(duplicate).toBeNull();
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // Different name: allowed concurrently.
    const other = store.refreshDatasource('b');
    expect(mockRefresh).toHaveBeenCalledTimes(2);

    resolvers.get('a')?.({ name: 'a', ok: true });
    await first;
    resolvers.get('b')?.({ name: 'b', ok: true });
    await other;
    expect(store.pending.value.size).toBe(0);
  });

  it('rethrows transport failures and clears pending', async () => {
    const failure = new Error('network down');
    const store = await setup({
      refresh: vi.fn().mockRejectedValue(failure),
    });
    const error = await store
      .refreshDatasource('a')
      .catch((error_: unknown) => error_);
    expect(error).toBe(failure);
    expect(store.pending.value.size).toBe(0);
  });
});
