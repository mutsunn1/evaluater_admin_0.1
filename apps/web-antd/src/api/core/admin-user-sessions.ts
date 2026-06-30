import { adminRequestClient } from '#/api/request';

export interface UserSessionItem {
  session_id: string;
  started_at: number | null;
  ended_at: number | null;
  duration_ms: number | null;
  cold_start_duration_ms: number | null;
  total_response_time_ms: number | null;
  question_count: number;
  final_hsk_level: number | null;
}

export interface UserSessionsResult {
  items: UserSessionItem[];
  total: number;
  page: number;
  page_size: number;
}

export async function getUserSessionsApi(
  user_id: string,
  params: { page?: number; page_size?: number } = {},
): Promise<UserSessionsResult> {
  return adminRequestClient.get<UserSessionsResult>(
    `/admin/v1/users/${encodeURIComponent(user_id)}/sessions`,
    { params },
  );
}
