import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:factory',
      order: 5,
      title: $t('page.forge.title'),
    },
    name: 'Forge',
    path: '/forge',
    children: [
      {
        name: 'ForgeConsole',
        path: '/forge/console',
        component: () => import('#/views/forge/console.vue'),
        meta: {
          icon: 'lucide:terminal',
          title: $t('page.forge.console'),
        },
      },
    ],
  },
];

export default routes;
