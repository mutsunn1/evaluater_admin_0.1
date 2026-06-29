import type { RouteRecordStringComponent } from '@vben/types';

import { adminRequestClient } from '#/api/request';

/**
 * 获取用户所有菜单
 */
export async function getAllMenusApi() {
  return adminRequestClient.get<RouteRecordStringComponent[]>('/menu/all');
}
