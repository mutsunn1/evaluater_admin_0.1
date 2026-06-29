import type { UserInfo } from '@vben/types';

import { adminRequestClient } from '#/api/request';

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  return adminRequestClient.get<UserInfo>('/admin/v1/user/info');
}
