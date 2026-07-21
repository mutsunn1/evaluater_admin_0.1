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
      {
        name: 'ForgeReview',
        path: '/forge/review',
        component: () => import('#/views/forge/review.vue'),
        meta: {
          icon: 'lucide:clipboard-check',
          title: $t('page.forge.review'),
        },
      },
      {
        name: 'ForgeMetrics',
        path: '/forge/metrics',
        component: () => import('#/views/forge/metrics.vue'),
        meta: {
          icon: 'lucide:gauge',
          title: $t('page.forge.metrics'),
        },
      },
      {
        name: 'ForgeBatches',
        path: '/forge/batches',
        component: () => import('#/views/forge/batches.vue'),
        meta: {
          icon: 'lucide:package',
          title: $t('page.forge.batches'),
        },
      },
    ],
  },
];

export default routes;
