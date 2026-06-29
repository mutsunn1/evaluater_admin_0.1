import { adminRequestClient } from '#/api/request';

export interface UserItem {
  user_id: string;
  hsk_level: number;
  native_language: string;
  updated_at: string;
}

export interface UserListResult {
  items: UserItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface UserProfile {
  user_id: string;
  hsk_level: number;
  native_language: string;
  skill_levels: Record<string, number>;
  stubborn_errors: string[];
  strengths: string[];
  next_focus: string[];
  created_at: string;
  updated_at: string;
}

export async function getUsersApi(params: {
  page: number;
  page_size: number;
  hsk_level?: number;
  q?: string;
}): Promise<UserListResult> {
  return adminRequestClient.get<UserListResult>('/admin/v1/users', { params });
}

export async function getUserDetailApi(user_id: string): Promise<UserProfile> {
  return adminRequestClient.get<UserProfile>(`/admin/v1/users/${encodeURIComponent(user_id)}`);
}
