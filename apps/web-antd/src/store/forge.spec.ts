import { nextTick } from 'vue';

import { useAccessStore } from '@vben/stores';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

async function setupStore(healthImpl: ReturnType<typeof vi.fn>) {
  vi.doMock('#/api', () => ({ getForgeHealthApi: healthImpl }));
  const { useForgeStore } = await import('./forge');
  return useForgeStore();
}

describe('forge store', () => {
  beforeEach(() => {
    vi.resetModules();
    setActivePinia(createPinia());
  });

  it('marks forge online when the health probe succeeds', async () => {
    const store = await setupStore(
      vi.fn().mockResolvedValue({
        status: 'ok',
        version: '0.1.0',
        llm_providers: [{ name: 'deepseek', ok: true }],
      }),
    );
    const online = await store.checkHealth();
    expect(online).toBe(true);
    expect(store.forgeOnline).toBe(true);
    expect(store.health?.version).toBe('0.1.0');
  });

  it('marks forge offline when the health probe fails', async () => {
    const store = await setupStore(
      vi.fn().mockRejectedValue(new Error('connection refused')),
    );
    const online = await store.checkHealth();
    expect(online).toBe(false);
    expect(store.forgeOnline).toBe(false);
    expect(store.health).toBeNull();
  });

  it('hides the forge menu while offline and restores it in place', async () => {
    const store = await setupStore(vi.fn());
    const accessStore = useAccessStore();
    accessStore.setAccessMenus([
      { name: 'Dashboard', path: '/dashboard' },
      {
        name: 'Forge',
        path: '/forge',
        children: [{ name: 'ForgeConsole', path: '/forge/console' }],
      },
      { name: 'QuestionBank', path: '/question-bank' },
    ] as any);

    store.forgeOnline = false;
    store.syncForgeMenu();
    expect(accessStore.accessMenus.map((menu) => menu.path)).toEqual([
      '/dashboard',
      '/question-bank',
    ]);

    store.forgeOnline = true;
    store.syncForgeMenu();
    expect(accessStore.accessMenus.map((menu) => menu.path)).toEqual([
      '/dashboard',
      '/forge',
      '/question-bank',
    ]);
    // Restored entry keeps its children.
    expect(accessStore.accessMenus[1]?.children).toHaveLength(1);
  });

  it('hides freshly generated menus while offline (e.g. after re-login)', async () => {
    const store = await setupStore(
      vi.fn().mockRejectedValue(new Error('offline')),
    );
    await store.checkHealth();
    expect(store.forgeOnline).toBe(false);

    const accessStore = useAccessStore();
    accessStore.setAccessMenus([
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Forge', path: '/forge' },
    ] as any);
    await nextTick();
    expect(accessStore.accessMenus.map((menu) => menu.path)).toEqual([
      '/dashboard',
    ]);
  });

  it('reacts to forgeOnline changes without manual sync calls', async () => {
    const store = await setupStore(vi.fn());
    const accessStore = useAccessStore();
    accessStore.setAccessMenus([{ name: 'Forge', path: '/forge' }] as any);

    store.forgeOnline = true;
    await nextTick();
    store.forgeOnline = false;
    await nextTick();
    expect(accessStore.accessMenus).toHaveLength(0);

    store.forgeOnline = true;
    await nextTick();
    expect(accessStore.accessMenus.map((menu) => menu.path)).toEqual([
      '/forge',
    ]);
  });

  it('polls health on an interval until stopped', async () => {
    vi.useFakeTimers();
    try {
      const mockHealth = vi.fn().mockResolvedValue({ status: 'ok' });
      const store = await setupStore(mockHealth);
      store.startHealthPolling(30_000);
      expect(mockHealth).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(mockHealth).toHaveBeenCalledTimes(2);
      store.stopHealthPolling();
      await vi.advanceTimersByTimeAsync(60_000);
      expect(mockHealth).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
