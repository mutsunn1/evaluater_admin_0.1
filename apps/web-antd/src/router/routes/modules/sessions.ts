import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:activity',
      order: 3,
      title: $t('page.sessions.title'),
    },
    name: 'Sessions',
    path: '/sessions',
    children: [
      {
        name: 'SessionMonitor',
        path: '/sessions/monitor',
        component: () => import('#/views/sessions/monitor/index.vue'),
        meta: {
          icon: 'lucide:radio',
          title: $t('page.sessions.monitor'),
        },
      },
      {
        name: 'SessionDetail',
        path: '/sessions/:session_id',
        component: () => import('#/views/sessions/detail/index.vue'),
        meta: {
          hideInMenu: true,
          title: $t('page.sessions.detail'),
        },
      },
    ],
  },
];

export default routes;
