import { adminRequestClient } from '#/api/request';

export interface DashboardData {
  total_users: number;
  avg_hsk_level: number;
  hsk_distribution: Array<{ hsk_level: number; count: number }>;
}

export async function getDashboardApi(): Promise<DashboardData> {
  return adminRequestClient.get<DashboardData>('/admin/v1/dashboard');
}
