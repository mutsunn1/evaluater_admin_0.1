import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:library',
      order: 4,
      title: $t('page.questionBank.title'),
    },
    name: 'QuestionBank',
    path: '/question-bank',
    children: [
      {
        name: 'QuestionBankList',
        path: '/question-bank/list',
        component: () => import('#/views/question-bank/list/index.vue'),
        meta: {
          icon: 'lucide:list',
          title: $t('page.questionBank.list'),
        },
      },
      {
        name: 'QuestionBankUpload',
        path: '/question-bank/upload',
        component: () => import('#/views/question-bank/upload/index.vue'),
        meta: {
          icon: 'lucide:upload',
          title: $t('page.questionBank.upload'),
        },
      },
    ],
  },
];

export default routes;
