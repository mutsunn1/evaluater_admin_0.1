import { adminRequestClient } from '#/api/request';

export interface LoginResult {
  access_token: string;
}

export async function adminLoginApi(password: string): Promise<LoginResult> {
  return adminRequestClient.post<LoginResult>('/admin/v1/login', { password });
}
