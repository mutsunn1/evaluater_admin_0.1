import { adminRequestClient } from '#/api/request';

export interface ActiveSessionItem {
  session_id: string;
  user_id: string | null;
  round: number;
  phase: 'cold_start' | 'evaluation';
  current_question_type: string | null;
  answers_count: number;
  last_activity_at: number | null;
}

export interface ActiveSessionsResult {
  items: ActiveSessionItem[];
  total: number;
}

export async function getActiveSessionsApi(): Promise<ActiveSessionsResult> {
  return adminRequestClient.get<ActiveSessionsResult>('/admin/v1/sessions/active');
}
