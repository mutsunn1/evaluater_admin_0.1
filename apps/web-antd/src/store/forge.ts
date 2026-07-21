import type { MenuRecordRaw } from '@vben/types';

import type { ForgeHealth } from '#/api';

import { ref, watch } from 'vue';

import { useAccessStore } from '@vben/stores';

import { defineStore } from 'pinia';

import { getForgeHealthApi } from '#/api';

/** Path of the forge top-level menu, used to toggle its visibility. */
export const FORGE_MENU_PATH = '/forge';

/** Interval between forge health probes. */
export const FORGE_HEALTH_INTERVAL = 30_000;

export const useForgeStore = defineStore('forge', () => {
  const accessStore = useAccessStore();

  /** Whether the forge service is reachable. Drives forge menu visibility. */
  const forgeOnline = ref(false);
  /** Last successful health payload (version, llm_providers, ...). */
  const health = ref<ForgeHealth | null>(null);

  let pollTimer: null | ReturnType<typeof setInterval> = null;
  // Stash of the hidden forge menu entry so it can be restored in place.
  let hiddenForgeMenu: null | { index: number; menu: MenuRecordRaw } = null;

  /** Probe the forge health endpoint once and update `forgeOnline`. */
  async function checkHealth() {
    try {
      const data = await getForgeHealthApi();
      health.value = data;
      forgeOnline.value = data.status === 'ok';
    } catch {
      health.value = null;
      forgeOnline.value = false;
    }
    return forgeOnline.value;
  }

  function startHealthPolling(interval: number = FORGE_HEALTH_INTERVAL) {
    stopHealthPolling();
    void checkHealth();
    pollTimer = setInterval(() => {
      void checkHealth();
    }, interval);
  }

  function stopHealthPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  /**
   * Hide the forge menu group while the service is offline and restore it
   * (at its original position) once the service comes back. Writes only
   * happen on an actual change, so re-applying is safe and loop-free.
   */
  function syncForgeMenu() {
    const menus = accessStore.accessMenus;
    const index = menus.findIndex((menu) => menu.path === FORGE_MENU_PATH);
    if (!forgeOnline.value) {
      if (index !== -1) {
        hiddenForgeMenu = { index, menu: menus[index] as MenuRecordRaw };
        accessStore.setAccessMenus(
          menus.filter((menu) => menu.path !== FORGE_MENU_PATH),
        );
      }
    } else if (index === -1 && hiddenForgeMenu) {
      const restored = [...menus];
      restored.splice(
        Math.min(hiddenForgeMenu.index, restored.length),
        0,
        hiddenForgeMenu.menu,
      );
      hiddenForgeMenu = null;
      accessStore.setAccessMenus(restored);
    }
  }

  watch(forgeOnline, syncForgeMenu);
  // Re-apply when menus are (re)generated, e.g. after logout and login.
  watch(() => accessStore.accessMenus, syncForgeMenu);

  /**
   * Forge availability is app-scoped, not session-scoped: a logout must not
   * stop health polling, only the cached health payload is dropped.
   */
  function $reset() {
    health.value = null;
  }

  return {
    $reset,
    checkHealth,
    forgeOnline,
    health,
    startHealthPolling,
    stopHealthPolling,
    syncForgeMenu,
  };
});
