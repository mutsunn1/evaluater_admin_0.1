import { adminRequestClient } from '#/api/request';

export interface SessionQuestionDetail {
  round_index: number;
  item_id: number;
  question_type: string;
  skill_dimension: string;
  pushed_at: number | null;
  answered_at: number | null;
  response_time_ms: number | null;
  is_correct: boolean | null;
  score: number | null;
}

export interface SessionRoundSummary {
  round_index: number;
  question_count: number;
  total_response_time_ms: number;
  correct_count: number;
  avg_response_time_ms: number | null;
}

export interface SessionDetail {
  session_id: string;
  user_id: string;
  started_at: number | null;
  ended_at: number | null;
  duration_ms: number | null;
  cold_start_duration_ms: number | null;
  total_response_time_ms: number | null;
  question_count: number;
  final_hsk_level: number | null;
  round_summaries: SessionRoundSummary[];
  questions: SessionQuestionDetail[];
}

export async function getSessionDetailApi(session_id: string): Promise<SessionDetail> {
  return adminRequestClient.get<SessionDetail>(`/admin/v1/sessions/${encodeURIComponent(session_id)}`);
}
