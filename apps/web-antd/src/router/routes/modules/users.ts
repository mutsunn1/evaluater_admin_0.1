import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:users',
      order: 2,
      title: $t('page.users.title'),
    },
    name: 'Users',
    path: '/users',
    children: [
      {
        name: 'UserList',
        path: '/users/list',
        component: () => import('#/views/users/list/index.vue'),
        meta: {
          icon: 'lucide:list',
          title: $t('page.users.list'),
        },
      },
      {
        name: 'UserDetail',
        path: '/users/:user_id',
        component: () => import('#/views/users/detail/index.vue'),
        meta: {
          hideInMenu: true,
          title: $t('page.users.detail'),
        },
      },
    ],
  },
];

export default routes;
