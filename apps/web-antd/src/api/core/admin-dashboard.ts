import { adminRequestClient } from '#/api/request';

export interface DashboardData {
  total_users: number;
  avg_hsk_level: number;
  avg_session_duration_ms: number | null;
  avg_response_time_ms: number | null;
  hsk_distribution: Array<{ hsk_level: number; count: number }>;
  new_users_trend: Array<{ date: string; count: number }>;
  native_language_distribution: Array<{ language: string; count: number }>;
  skill_dimension_avg: Record<string, number>;
}

export async function getDashboardApi(days: number = 7): Promise<DashboardData> {
  return adminRequestClient.get<DashboardData>('/admin/v1/dashboard', {
    params: { days },
  });
}
